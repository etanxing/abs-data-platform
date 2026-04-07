#!/usr/bin/env python3
from __future__ import annotations
"""
Import processed ABS CSVs into a Cloudflare D1 database.

Steps:
  1. Creates the D1 database (skips if already exists)
  2. Applies schema.sql
  3. Generates batched SQL INSERT files from processed CSVs
  4. Executes each SQL file via `wrangler d1 execute`
  5. Prints the D1 database ID so you can update wrangler.toml

Usage:
    cd abs-data-platform          # repo root
    python data/abs/import_to_d1.py [--local] [--db-name abs-data]

Flags:
  --local     target local D1 (wrangler dev / miniflare) instead of Cloudflare
  --db-name   D1 database name (default: abs-data)

Requirements: wrangler must be authenticated (`wrangler login`).
"""

import csv
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR    = Path(__file__).parent
PROCESSED_DIR = SCRIPT_DIR / "processed"
SCHEMA_FILE   = SCRIPT_DIR / "schema.sql"
REPO_ROOT     = SCRIPT_DIR.parent.parent

# ──────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────
DB_NAME   = "abs-data"
LOCAL      = "--local" in sys.argv
BATCH_SIZE = 200   # rows per INSERT statement

for arg in sys.argv[1:]:
    if arg.startswith("--db-name="):
        DB_NAME = arg.split("=", 1)[1]
    elif arg == "--db-name" and sys.argv.index(arg) + 1 < len(sys.argv):
        DB_NAME = sys.argv[sys.argv.index(arg) + 1]

# Wrangler 4.x defaults to local for d1 execute; always pass explicit flag
LOCAL_FLAG = ["--local"] if LOCAL else ["--remote"]


def run(cmd: list[str], cwd: Path = REPO_ROOT, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command, stream output."""
    full = ["pnpm", "exec", "wrangler"] + cmd + LOCAL_FLAG if cmd[0] == "d1" else cmd
    print(f"  $ {' '.join(full)}")
    return subprocess.run(full, cwd=cwd, check=check, capture_output=False, text=True)


def wrangler(*args: str, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    cmd = ["pnpm", "exec", "wrangler"] + list(args)
    # Wrangler 4.x defaults to local when no wrangler.toml is found in cwd.
    # Always pass an explicit location flag.
    if LOCAL:
        cmd.append("--local")
    else:
        cmd.append("--remote")
    if capture:
        return subprocess.run(cmd, cwd=REPO_ROOT, check=check, capture_output=True, text=True)
    return subprocess.run(cmd, cwd=REPO_ROOT, check=check, text=True)


# ──────────────────────────────────────────────────────────────
# Step 1 — ensure D1 database exists
# ──────────────────────────────────────────────────────────────

def ensure_database() -> str | None:
    """Create D1 database if it doesn't exist. Return database UUID."""
    if LOCAL:
        print(f"\n[D1] Using local D1 (--local mode) — no remote DB needed")
        return None

    # List existing databases
    result = wrangler("d1", "list", "--json", capture=True, check=False)
    if result.returncode == 0:
        try:
            dbs = json.loads(result.stdout)
            for db in dbs:
                if db.get("name") == DB_NAME:
                    db_id = db.get("uuid") or db.get("database_id")
                    print(f"\n[D1] Database '{DB_NAME}' already exists: {db_id}")
                    return db_id
        except json.JSONDecodeError:
            pass

    print(f"\n[D1] Creating database '{DB_NAME}' …")
    result = wrangler("d1", "create", DB_NAME, capture=True, check=False)
    if result.returncode != 0:
        print(f"  ⚠ Could not create DB (may already exist): {result.stderr.strip()}")
    else:
        # Parse the UUID from output
        for line in result.stdout.splitlines():
            if "database_id" in line.lower() or "uuid" in line.lower():
                print(f"  {line.strip()}")

    # Re-fetch to get UUID
    result = wrangler("d1", "list", "--json", capture=True, check=False)
    if result.returncode == 0:
        try:
            dbs = json.loads(result.stdout)
            for db in dbs:
                if db.get("name") == DB_NAME:
                    return db.get("uuid") or db.get("database_id")
        except json.JSONDecodeError:
            pass
    return None


# ──────────────────────────────────────────────────────────────
# Step 2 — apply schema
# ──────────────────────────────────────────────────────────────

def apply_schema() -> None:
    print(f"\n[Schema] Applying schema.sql …")
    wrangler("d1", "execute", DB_NAME, f"--file={SCHEMA_FILE}")
    print("  ✓ Schema applied")


# ──────────────────────────────────────────────────────────────
# Step 3 — generate and execute INSERT batches
# ──────────────────────────────────────────────────────────────

def csv_to_sql(csv_path: Path, table: str) -> list[str]:
    """Convert a CSV to a list of batched INSERT SQL strings."""
    rows: list[dict] = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rows.append(row)

    if not rows:
        return []

    columns = list(rows[0].keys())
    col_list = ", ".join(columns)

    def escape(v: str) -> str:
        if v == "" or v.lower() == "nan" or v.lower() == "<na>":
            return "NULL"
        # Escape single quotes
        v = v.replace("'", "''")
        # If numeric, no quotes
        try:
            float(v)
            return v
        except ValueError:
            return f"'{v}'"

    statements: list[str] = []
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        values_list = []
        for row in batch:
            vals = ", ".join(escape(str(row.get(c, ""))) for c in columns)
            values_list.append(f"  ({vals})")
        sql = f"INSERT OR REPLACE INTO {table} ({col_list}) VALUES\n"
        sql += ",\n".join(values_list) + ";"
        statements.append(sql)

    return statements


def import_table(csv_name: str, table: str) -> None:
    csv_path = PROCESSED_DIR / csv_name
    if not csv_path.exists():
        print(f"  ⚠ Skipping {csv_name} — file not found")
        return

    statements = csv_to_sql(csv_path, table)
    if not statements:
        print(f"  ⚠ {csv_name} is empty — skipping")
        return

    total_rows = sum(
        s.count("\n  (") + 1  # rough count
        for s in statements
    )
    print(f"\n[Import] {table} ({csv_name}) — ~{total_rows} rows in {len(statements)} batch(es)")

    for idx, sql in enumerate(statements, 1):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".sql", delete=False, encoding="utf-8"
        ) as tmp:
            tmp.write(sql)
            tmp_path = tmp.name

        try:
            print(f"  Batch {idx}/{len(statements)} …", end=" ", flush=True)
            wrangler("d1", "execute", DB_NAME, f"--file={tmp_path}")
            print("✓")
        finally:
            Path(tmp_path).unlink(missing_ok=True)


# ──────────────────────────────────────────────────────────────
# Ordered import (respects foreign key deps)
# ──────────────────────────────────────────────────────────────

IMPORT_ORDER = [
    ("sa2_areas.csv",              "sa2_areas"),
    ("postcode_sa2_mapping.csv",   "postcode_sa2_mapping"),
    ("demographics.csv",           "demographics"),
    ("seifa_scores.csv",           "seifa_scores"),
    ("housing.csv",                "housing"),
    ("age_distribution.csv",       "age_distribution"),
    ("language_diversity.csv",     "language_diversity"),
]


def main() -> None:
    print("ABS D1 Importer\n" + "=" * 50)
    print(f"Database : {DB_NAME}")
    print(f"Mode     : {'LOCAL' if LOCAL else 'REMOTE (Cloudflare)'}")

    if not PROCESSED_DIR.exists() or not list(PROCESSED_DIR.glob("*.csv")):
        print("\n✗ No processed CSVs found. Run process_abs_data.py first.")
        sys.exit(1)

    db_id = ensure_database()
    apply_schema()

    for csv_name, table in IMPORT_ORDER:
        import_table(csv_name, table)

    print("\n" + "=" * 50)
    print("✓ Import complete.")
    if db_id:
        print(f"\n⚡ Update apps/api/wrangler.toml:")
        print(f'   [[d1_databases]]')
        print(f'   binding = "DB"')
        print(f'   database_name = "{DB_NAME}"')
        print(f'   database_id = "{db_id}"')


if __name__ == "__main__":
    main()
