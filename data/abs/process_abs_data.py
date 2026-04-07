#!/usr/bin/env python3
from __future__ import annotations
"""
Transform raw ABS downloads into clean CSVs ready for D1 import.

Inputs  (data/abs/raw/):
  SEIFA_2021_SA2.xlsx                  — SEIFA scores
  CG_POSTCODE_2021_SA2_2021.csv        — postcode-to-SA2 mapping
  census_{STATE}/  (extracted DataPacks) — Census 2021 GCP tables
                   NSW, VIC, QLD, SA, WA, TAS, NT, ACT

Outputs (data/abs/processed/):
  sa2_areas.csv
  postcode_sa2_mapping.csv
  demographics.csv
  seifa_scores.csv
  housing.csv
  age_distribution.csv
  language_diversity.csv

Usage:
    python process_abs_data.py [--discover]

Pass --discover to print all columns in each Census table (useful for
verifying column names against a freshly downloaded DataPack).
"""

import sys
import warnings
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

RAW_DIR       = Path(__file__).parent / "raw"
PROCESSED_DIR = Path(__file__).parent / "processed"
PROCESSED_DIR.mkdir(exist_ok=True)

STATES = {"NSW": "1", "VIC": "2", "QLD": "3", "SA": "4",
          "WA": "5", "TAS": "6", "NT": "7", "ACT": "8"}
STATE_BY_CODE = {v: k for k, v in STATES.items()}

DISCOVER = "--discover" in sys.argv


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def find_census_files(state: str, table: str) -> list[Path]:
    """Locate Census DataPack CSV(s) for the given state and table code.

    Handles both single-file tables (G01 → G01_NSW_SA2.csv) and
    split-file tables (G04 → G04A_NSW_SA2.csv + G04B_NSW_SA2.csv).
    Returns a list of matching paths sorted alphabetically.
    """
    base = RAW_DIR / f"census_{state}"
    # Try exact match first
    hits = list(base.rglob(f"*{table}_{state}_SA2.csv"))
    if hits:
        return sorted(hits)
    # Try split-part match: G04A, G04B, G51A, G51B, G51C …
    hits = list(base.rglob(f"*{table}[A-Z]_{state}_SA2.csv"))
    if hits:
        return sorted(hits)
    print(f"  ⚠ Not found: {table} under {base}")
    return []


def find_census_file(state: str, table: str) -> Path | None:
    hits = find_census_files(state, table)
    return hits[0] if hits else None


def load_census(state: str, table: str) -> pd.DataFrame | None:
    """Load and concatenate all parts of a Census DataPack table."""
    paths = find_census_files(state, table)
    if not paths:
        return None

    frames = []
    for path in paths:
        df = pd.read_csv(path, dtype=str)
        # Normalise the SA2 code column name (varies between short-header versions)
        for candidate in ("SA2_CODE_2021", "SA2_MAINCODE_2021", "SA2_CODE"):
            if candidate in df.columns:
                df = df.rename(columns={candidate: "sa2_code"})
                break
        if "sa2_code" not in df.columns:
            print(f"  ✗ Cannot find SA2 code column in {path.name}. Columns: {list(df.columns)[:8]}")
            continue
        frames.append(df)

    if not frames:
        return None

    if len(frames) == 1:
        df = frames[0]
    else:
        # Merge parts on sa2_code (outer join to keep all rows)
        df = frames[0]
        for part in frames[1:]:
            # Drop duplicate SA2 code col from part before merging
            df = df.merge(part, on="sa2_code", how="outer", suffixes=("", f"_dup"))
            # Drop any duplicate columns introduced by the merge
            df = df[[c for c in df.columns if not c.endswith("_dup")]]

    if DISCOVER:
        print(f"\n  [{state} {table}] columns ({len(df.columns)}):")
        for c in df.columns:
            print(f"    {c}")
    return df


def col(df: pd.DataFrame, *candidates: str) -> str | None:
    """Return the first matching column name, or None."""
    for c in candidates:
        if c in df.columns:
            return c
    return None


def to_float(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def to_int(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").round().astype("Int64")


def safe_pct(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    """numerator / denominator clamped to [0, 1], NaN where denom=0."""
    n = to_float(numerator)
    d = to_float(denominator)
    return (n / d.replace(0, float("nan"))).clip(0, 1)


# ──────────────────────────────────────────────────────────────
# 1. SEIFA 2021
# ──────────────────────────────────────────────────────────────

def process_seifa() -> pd.DataFrame:
    """
    Read SEIFA 2021 SA2 Excel → DataFrame with standardised columns.

    The 2021 SEIFA SA2 Excel contains:
      Table 1 — Summary (all 4 indices), header at row 5, data from row 6
                 Cols: SA2 code, SA2 name, IRSD Score, IRSD Decile,
                       IRSAD Score, IRSAD Decile, IER Score, IER Decile,
                       IEO Score, IEO Decile
      Table 2 — IRSD detail (with population), header at row 5
                 Cols: SA2 code, SA2 name, Population, Score, (blank), Rank, Decile, Percentile
    """
    print("\n[SEIFA] Processing SEIFA_2021_SA2.xlsx …")
    path = RAW_DIR / "SEIFA_2021_SA2.xlsx"
    if not path.exists():
        raise FileNotFoundError(f"Missing: {path}")

    # Table 1: summary — all four indices
    t1 = pd.read_excel(path, sheet_name="Table 1", header=5, dtype=str)
    t1 = t1.dropna(how="all").reset_index(drop=True)
    if DISCOVER:
        print(f"  Table 1 columns: {list(t1.columns)}")

    # Positional column assignment (known from ABS 2021 SEIFA format)
    cols_t1 = t1.columns.tolist()
    sa2_code_col = cols_t1[0]
    sa2_name_col = cols_t1[1]
    # After SA2 code+name: IRSD Score, IRSD Decile, IRSAD Score, IRSAD Decile,
    #                      IER Score, IER Decile, IEO Score, IEO Decile
    data_cols = [c for c in cols_t1[2:] if "Unnamed" not in str(c) or not str(c).startswith("Unnamed")]
    # Just use positional slicing: columns 2..9
    data_cols = cols_t1[2:10]

    out = pd.DataFrame()
    out["sa2_code"] = t1[sa2_code_col].astype(str).str.strip().str.split(".").str[0].str.zfill(9)
    out["sa2_name"] = t1[sa2_name_col].astype(str).str.strip()

    def try_col(idx: int) -> pd.Series:
        if idx < len(cols_t1):
            return to_int(t1[cols_t1[idx]])
        return pd.Series([None] * len(t1))

    out["irsd_score"]   = try_col(2)
    out["irsd_decile"]  = try_col(3)
    out["irsad_score"]  = try_col(4)
    out["irsad_decile"] = try_col(5)
    out["ier_score"]    = try_col(6)
    out["ier_decile"]   = try_col(7)
    out["ieo_score"]    = try_col(8)
    out["ieo_decile"]   = try_col(9)

    # Table 2: IRSD with population
    t2 = pd.read_excel(path, sheet_name="Table 2", header=5, dtype=str)
    t2 = t2.dropna(how="all").reset_index(drop=True)
    cols_t2 = t2.columns.tolist()
    pop_df = pd.DataFrame()
    pop_df["sa2_code"] = t2[cols_t2[0]].astype(str).str.strip().str.split(".").str[0].str.zfill(9)
    pop_df["usual_resident_population"] = to_int(t2[cols_t2[2]])

    out = out.merge(pop_df, on="sa2_code", how="left")

    # Drop non-numeric SA2 codes (totals rows etc.)
    out = out[out["sa2_code"].str.match(r"^\d{9}$")].reset_index(drop=True)
    print(f"  ✓ {len(out)} SA2 areas (all states)")
    return out


# ──────────────────────────────────────────────────────────────
# 2. Postcode → SA2 correspondence
# ──────────────────────────────────────────────────────────────

def process_postcode_sa2() -> pd.DataFrame:
    """
    Derive postcode→SA2 correspondence by joining two ABS allocation files
    on Mesh Block code:
      SA2_2021_AUST.xlsx  — MB → SA2
      POA_2021_AUST.xlsx  — MB → POA (postal area ≈ postcode)

    The old CG_POSTCODE_2021_SA2_2021.csv no longer exists in ASGS Edition 3.
    """
    print("\n[Postcode→SA2] Deriving from SA2 + POA allocation files …")

    mb_path  = RAW_DIR / "MB_2021_AUST.xlsx"
    poa_path = RAW_DIR / "POA_2021_AUST.xlsx"

    if not mb_path.exists():
        raise FileNotFoundError(f"Missing: {mb_path}")
    if not poa_path.exists():
        raise FileNotFoundError(f"Missing: {poa_path}")

    # Load MB allocation: MB_CODE → SA2_CODE (among many other geographies)
    print("  Loading MB allocation (35 MB, may take ~30s) …")
    mb_df = pd.read_excel(mb_path, dtype=str)
    if DISCOVER:
        print(f"  MB alloc columns: {list(mb_df.columns)}")

    mb_col_mb   = col(mb_df, "MB_CODE_2021", "MB_CODE", "MESHBLOCK_CODE")
    sa2_code_col = col(mb_df, "SA2_CODE_2021", "SA2_MAINCODE_2021", "SA2_CODE")

    if not mb_col_mb or not sa2_code_col:
        raise ValueError(
            f"Cannot find MB/SA2 columns in MB allocation.\nAvailable: {list(mb_df.columns)}"
        )

    sa2_alloc = mb_df[[mb_col_mb, sa2_code_col]].copy()
    sa2_alloc.columns = ["mb_code", "sa2_code"]
    sa2_alloc["sa2_code"] = sa2_alloc["sa2_code"].astype(str).str.strip().str.zfill(9)
    # Keep all valid 9-digit SA2 codes (all states)
    sa2_alloc = sa2_alloc[sa2_alloc["sa2_code"].str.match(r"^\d{9}$")]
    print(f"  {len(sa2_alloc)} national mesh blocks with SA2")

    # Load POA allocation: MB_CODE → POA_CODE (= postcode)
    print("  Loading POA allocation (18 MB, may take ~20s) …")
    poa_df = pd.read_excel(poa_path, dtype=str)
    if DISCOVER:
        print(f"  POA alloc columns: {list(poa_df.columns)}")

    mb_col_poa  = col(poa_df, "MB_CODE_2021", "MB_CODE", "MESHBLOCK_CODE")
    poa_code_col = col(poa_df, "POA_CODE_2021", "POA_CODE", "POSTCODE")

    if not mb_col_poa or not poa_code_col:
        raise ValueError(
            f"Cannot find MB/POA columns in POA allocation.\nAvailable: {list(poa_df.columns)}"
        )

    poa_alloc = poa_df[[mb_col_poa, poa_code_col]].copy()
    poa_alloc.columns = ["mb_code", "postcode"]
    poa_alloc = poa_alloc.dropna()
    print(f"  {len(poa_alloc)} total mesh blocks with POA")

    # Join MB → (SA2, POA), then aggregate: count MBs per (postcode, SA2) pair
    merged = poa_alloc.merge(sa2_alloc, on="mb_code", how="inner")
    grouped = (
        merged.groupby(["postcode", "sa2_code"])
        .size()
        .reset_index(name="mb_count")
    )

    # Compute ratio: share of this postcode's MBs that fall in each SA2
    total_per_postcode = grouped.groupby("postcode")["mb_count"].transform("sum")
    grouped["ratio"] = (grouped["mb_count"] / total_per_postcode).round(4)

    out = grouped[["postcode", "sa2_code", "ratio"]].copy()
    # Normalise postcode: strip leading zeros since ABS postcodes are 4-char strings
    out["postcode"] = out["postcode"].str.strip().str.zfill(4)
    out = out.dropna(subset=["postcode", "sa2_code"]).reset_index(drop=True)
    print(f"  ✓ {len(out)} postcode→SA2 mappings")
    return out


# ──────────────────────────────────────────────────────────────
# 3. Census G01 — total population, indigenous, born overseas
# ──────────────────────────────────────────────────────────────

def process_g01(states: list[str]) -> pd.DataFrame:
    print("\n[G01] Processing population characteristics …")
    frames = []
    for state in states:
        df = load_census(state, "G01")
        if df is None:
            continue
        frames.append(df)
    if not frames:
        raise RuntimeError("No G01 data found. Check Census DataPack extraction.")
    df = pd.concat(frames, ignore_index=True)

    # Total persons
    tot_col = col(df, "Tot_P_P", "Tot_persons_P", "Total_persons")
    # Indigenous total — G01 has a column for this
    ind_col = col(df, "Indigenous_P_Tot_P", "Aboriginal_Torres_Strait_Islander_P",
                  "Indig_P_Tot_P")
    # Born overseas aggregate (may not be in G01; handled via G09 if missing)
    bos_col = col(df, "BornOSeas_P", "Born_overseas_P", "Birthplace_overseas_P")

    if tot_col is None:
        raise ValueError(f"Cannot find total population column in G01. Columns: {list(df.columns)[:20]}")

    out = pd.DataFrame()
    out["sa2_code"]          = df["sa2_code"].str.zfill(9)
    out["total_population"]  = to_int(df[tot_col])
    out["indigenous_count"]  = to_int(df[ind_col]) if ind_col else None
    out["born_overseas"]     = to_int(df[bos_col]) if bos_col else None

    out = out[out["sa2_code"].str.match(r"^\d{9}$")].reset_index(drop=True)
    print(f"  ✓ {len(out)} SA2 rows from G01")
    return out


# ──────────────────────────────────────────────────────────────
# 4. Census G02 — medians (age, income, rent, mortgage)
# ──────────────────────────────────────────────────────────────

def process_g02(states: list[str]) -> pd.DataFrame:
    print("\n[G02] Processing selected medians and averages …")
    frames = []
    for state in states:
        df = load_census(state, "G02")
        if df is None:
            continue
        frames.append(df)
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)

    med_age   = col(df, "Median_age_persons", "Median_age_P")
    med_hhinc = col(df, "Median_household_weekly_income",
                    "Median_tot_hhd_inc_weekly", "Median_household_income_wkly")
    med_inc   = col(df, "Median_tot_prsnl_inc_weekly", "Median_personal_income_wkly")
    med_rent  = col(df, "Median_rent_weekly", "Median_Rent_weekly")
    med_mort  = col(df, "Median_mortgage_repay_monthly", "Median_morgage_repay_monthly",
                    "Median_mortgage_monthly")

    out = pd.DataFrame()
    out["sa2_code"]               = df["sa2_code"].str.zfill(9)
    out["median_age"]             = to_float(df[med_age]) if med_age else None
    out["median_household_income"]= to_int(df[med_hhinc]) if med_hhinc else None
    out["median_personal_income"] = to_int(df[med_inc]) if med_inc else None
    out["median_rent_weekly"]     = to_int(df[med_rent]) if med_rent else None
    out["median_mortgage_monthly"]= to_int(df[med_mort]) if med_mort else None

    out = out[out["sa2_code"].str.match(r"^\d{9}$")].reset_index(drop=True)
    print(f"  ✓ {len(out)} SA2 rows from G02")
    return out


# ──────────────────────────────────────────────────────────────
# 5. Census G04 — age distribution
# ──────────────────────────────────────────────────────────────

def process_g04(states: list[str]) -> pd.DataFrame:
    """
    Census G04: Age by Sex.
    Short-header column pattern: Age_yr_0_4_P, Age_yr_5_9_P, …, Age_yr_85ov_P
    """
    print("\n[G04] Processing age distribution …")
    frames = []
    for state in states:
        df = load_census(state, "G04")
        if df is None:
            continue
        frames.append(df)
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)

    def age_sum(*patterns: str) -> pd.Series:
        """Sum columns matching any of the given patterns."""
        matched = [c for c in df.columns if any(p.lower() in c.lower() for p in patterns)]
        if not matched:
            return pd.Series([None] * len(df))
        return df[matched].apply(pd.to_numeric, errors="coerce").sum(axis=1)

    # Map Census 5-year bands → our 10-year buckets
    tot = to_float(df.get(col(df, "Tot_P_P", "Age_yr_Tot_P") or "", pd.Series(dtype=float)))
    if tot.isna().all():
        # Derive total from age sum
        age_cols = [c for c in df.columns if "Age_yr_" in c and c.endswith("_P")]
        tot = df[age_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1)

    out = pd.DataFrame()
    out["sa2_code"]        = df["sa2_code"].str.zfill(9)
    out["_total"]          = tot

    out["age_0_4_n"]       = age_sum("Age_yr_0_4_P", "Age_0_4_yr_P")
    out["age_5_9_n"]       = age_sum("Age_yr_5_9_P",  "Age_5_9_yr_P")
    out["age_10_14_n"]     = age_sum("Age_yr_10_14_P","Age_10_14_yr_P")
    out["age_15_19_n"]     = age_sum("Age_yr_15_19_P","Age_15_19_yr_P")
    out["age_20_24_n"]     = age_sum("Age_yr_20_24_P","Age_20_24_yr_P")
    out["age_25_34_n"]     = age_sum("Age_yr_25_29_P","Age_yr_30_34_P")
    out["age_35_44_n"]     = age_sum("Age_yr_35_39_P","Age_yr_40_44_P")
    out["age_45_54_n"]     = age_sum("Age_yr_45_49_P","Age_yr_50_54_P")
    out["age_55_64_n"]     = age_sum("Age_yr_55_59_P","Age_yr_60_64_P")
    out["age_65_74_n"]     = age_sum("Age_yr_65_69_P","Age_yr_70_74_P")
    out["age_75_plus_n"]   = age_sum("Age_yr_75_79_P","Age_yr_80_84_P","Age_yr_85ov_P")

    # Combine into our bucket structure and convert to percentages
    def pct(col_name: str, *parts: str) -> pd.Series:
        s = sum(out[p] for p in parts if p in out.columns)
        return safe_pct(s, out["_total"])

    final = pd.DataFrame()
    final["sa2_code"]        = out["sa2_code"]
    final["age_0_4_pct"]     = pct("age_0_4_pct",   "age_0_4_n")
    final["age_5_14_pct"]    = pct("age_5_14_pct",  "age_5_9_n", "age_10_14_n")
    final["age_15_24_pct"]   = pct("age_15_24_pct", "age_15_19_n", "age_20_24_n")
    final["age_25_34_pct"]   = pct("age_25_34_pct", "age_25_34_n")
    final["age_35_44_pct"]   = pct("age_35_44_pct", "age_35_44_n")
    final["age_45_54_pct"]   = pct("age_45_54_pct", "age_45_54_n")
    final["age_55_64_pct"]   = pct("age_55_64_pct", "age_55_64_n")
    final["age_65_74_pct"]   = pct("age_65_74_pct", "age_65_74_n")
    final["age_75_plus_pct"] = pct("age_75_plus_pct","age_75_plus_n")

    # Round to 4 dp
    pct_cols = [c for c in final.columns if c.endswith("_pct")]
    final[pct_cols] = final[pct_cols].round(4)

    final = final[final["sa2_code"].str.match(r"^\d{9}$")].reset_index(drop=True)
    print(f"  ✓ {len(final)} SA2 rows from G04")
    return final


# ──────────────────────────────────────────────────────────────
# 6. Census G33 — housing tenure
# ──────────────────────────────────────────────────────────────

def process_g33(states: list[str]) -> pd.DataFrame:
    """
    G33: Tenure Type and Landlord Type by Dwelling Structure.
    We want totals for: owned outright, owned with mortgage, rented (private),
    rented (social/community), other/not stated.

    Short-header column patterns:
      Owned outright:     O_OR_*_HS (separate house), O_OR_*_SD (semi), etc.
      Owned w/ mortgage:  O_MG_*
      Rented – private:   R_PL_* or Rent_*
      Social housing:     R_SH_* (state housing), R_CH_* (community housing)
      Total dwellings:    Total_* or Tot_Dwelings (note: typo in some releases)
    """
    print("\n[G33] Processing housing tenure …")
    frames = []
    for state in states:
        df = load_census(state, "G33")
        if df is None:
            continue
        frames.append(df)
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)

    def sum_cols(*patterns: str) -> pd.Series:
        matched = [c for c in df.columns if any(p.lower() in c.lower() for p in patterns)]
        if not matched:
            return pd.Series([None] * len(df))
        return df[matched].apply(pd.to_numeric, errors="coerce").sum(axis=1)

    # Total dwellings — look for a total column
    tot_col = col(df, "Total_Total", "Tot_dwelings", "Total_Dwellings", "Total_Total_P")
    if tot_col:
        total_dw = to_float(df[tot_col])
    else:
        # Sum all columns that end in a tenure suffix
        all_dw = [c for c in df.columns if c not in ("sa2_code",)
                  and not c.startswith("Occupied")]
        total_dw = df[all_dw].apply(pd.to_numeric, errors="coerce").sum(axis=1)

    owned_outright = sum_cols("O_OR_")
    owned_mortgage = sum_cols("O_MG_")
    rented_private = sum_cols("R_PL_", "Rent_prvt_", "Pvt_renter_")
    rented_social  = sum_cols("R_SH_", "R_CH_", "Social_housing_", "State_hsg_", "Com_hsg_")

    out = pd.DataFrame()
    out["sa2_code"]          = df["sa2_code"].str.zfill(9)
    out["total_dwellings"]   = to_int(total_dw)
    out["owner_occupied_pct"]= safe_pct(owned_outright + owned_mortgage, total_dw).round(4)
    out["renting_pct"]       = safe_pct(rented_private, total_dw).round(4)
    out["social_housing_pct"]= safe_pct(rented_social, total_dw).round(4)

    out = out[out["sa2_code"].str.match(r"^\d{9}$")].reset_index(drop=True)
    print(f"  ✓ {len(out)} SA2 rows from G33")
    return out


# ──────────────────────────────────────────────────────────────
# 7. Census G51 — language spoken at home
# ──────────────────────────────────────────────────────────────

def process_g51(states: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    G51: Language Spoken at Home by Proficiency in English.
    Returns:
      - lang_df: top-10 languages per SA2 (for language_diversity table)
      - english_only_df: English-only percentage per SA2 (for demographics)
    """
    print("\n[G51] Processing language spoken at home …")
    frames = []
    for state in states:
        df = load_census(state, "G51")
        if df is None:
            continue
        frames.append(df)
    if not frames:
        return pd.DataFrame(), pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)

    df = df[df["sa2_code"].str.match(r"^\d{9}$", na=False)].copy()
    df["sa2_code"] = df["sa2_code"].str.zfill(9)

    # English-only column
    eng_col = col(df, "Eng_only_LH_P", "English_only_P", "Lang_eng_only_P",
                  "Speaks_eng_only_P")
    tot_col = col(df, "Tot_P", "Total_P", "Tot_Lang_P")

    # Build english_only_df
    eng_df = pd.DataFrame()
    eng_df["sa2_code"] = df["sa2_code"]
    if eng_col and tot_col:
        eng_df["speaks_english_only_pct"] = safe_pct(
            to_float(df[eng_col]), to_float(df[tot_col])
        ).round(4)
    else:
        eng_df["speaks_english_only_pct"] = None

    # Build language diversity: melt language count columns
    # G51 has columns like Mandarin_P, Italian_P, Arabic_P … total persons
    # Identify language-count columns: they generally end in _P and are not the
    # standard demographic columns
    skip_patterns = {"sa2_code", "Tot_", "Total_", "Eng_", "English_", "Not_stated",
                     "Oth_Lang", "Other_lang"}
    lang_cols = [
        c for c in df.columns
        if c.endswith("_P") and not any(c.startswith(p) for p in skip_patterns)
        and c not in ("sa2_code",)
    ]

    if lang_cols:
        lang_data = df[["sa2_code"] + lang_cols].melt(
            id_vars="sa2_code", var_name="language_raw", value_name="count"
        )
        lang_data["count"] = to_float(lang_data["count"])
        lang_data = lang_data.dropna(subset=["count"])
        lang_data = lang_data[lang_data["count"] > 0]

        # Derive totals for percentage
        totals = df[["sa2_code"]].copy()
        if tot_col:
            totals["total"] = to_float(df[tot_col])
        else:
            totals["total"] = df[lang_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1)
        lang_data = lang_data.merge(totals, on="sa2_code", how="left")
        lang_data["pct"] = (lang_data["count"] / lang_data["total"].replace(0, float("nan"))).round(4)

        # Clean language name: strip trailing _P, replace _ with space
        lang_data["language"] = (
            lang_data["language_raw"]
            .str.replace(r"_P$", "", regex=True)
            .str.replace("_", " ")
            .str.title()
        )

        # Keep top 10 languages per SA2
        lang_data = (
            lang_data
            .sort_values(["sa2_code", "count"], ascending=[True, False])
            .groupby("sa2_code")
            .head(10)
            .reset_index(drop=True)
        )[["sa2_code", "language", "count", "pct"]]
        lang_data["count"] = lang_data["count"].astype(int)
    else:
        lang_data = pd.DataFrame(columns=["sa2_code", "language", "count", "pct"])
        print("  ⚠ No language columns identified in G51")

    print(f"  ✓ {len(eng_df)} SA2 rows (English-only), {len(lang_data)} language rows")
    return lang_data, eng_df


# ──────────────────────────────────────────────────────────────
# 8. Assemble and save outputs
# ──────────────────────────────────────────────────────────────

def main() -> None:
    print("ABS Data Processor\n" + "=" * 50)
    states = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]

    # ── SEIFA
    seifa = process_seifa()

    # ── SA2 Areas (built from SEIFA + state code logic)
    sa2 = seifa[["sa2_code", "sa2_name"]].copy()
    sa2["state_code"] = sa2["sa2_code"].str[0]
    sa2["state_name"] = sa2["state_code"].map(STATE_BY_CODE)
    sa2["lga_code"]   = None
    sa2["lga_name"]   = None
    sa2.to_csv(PROCESSED_DIR / "sa2_areas.csv", index=False)
    print(f"\n[OUT] sa2_areas.csv — {len(sa2)} rows")

    # ── SEIFA scores table
    seifa_out = seifa.drop(columns=["sa2_name"], errors="ignore")
    seifa_out.to_csv(PROCESSED_DIR / "seifa_scores.csv", index=False)
    print(f"[OUT] seifa_scores.csv — {len(seifa_out)} rows")

    # ── Postcode → SA2
    pc_sa2 = process_postcode_sa2()
    # Join to filter only SA2s that exist in our sa2 table
    valid_sa2s = set(sa2["sa2_code"])
    pc_sa2 = pc_sa2[pc_sa2["sa2_code"].isin(valid_sa2s)]
    pc_sa2.to_csv(PROCESSED_DIR / "postcode_sa2_mapping.csv", index=False)
    print(f"[OUT] postcode_sa2_mapping.csv — {len(pc_sa2)} rows")

    # ── G01 (population, indigenous, born overseas)
    g01 = process_g01(states)

    # ── G02 (medians)
    g02 = process_g02(states)

    # ── G04 (age distribution)
    g04 = process_g04(states)

    # ── G33 (housing tenure)
    g33 = process_g33(states)

    # ── G51 (language)
    lang, eng_only = process_g51(states)
    lang.to_csv(PROCESSED_DIR / "language_diversity.csv", index=False)
    print(f"[OUT] language_diversity.csv — {len(lang)} rows")

    # ── Assemble demographics table
    demo = g01[["sa2_code", "total_population", "indigenous_count", "born_overseas"]].copy()
    if not g02.empty:
        demo = demo.merge(g02, on="sa2_code", how="left")
    if not eng_only.empty:
        demo = demo.merge(eng_only, on="sa2_code", how="left")

    # Convert counts to percentages
    for count_col, pct_col, denom in [
        ("indigenous_count",  "indigenous_population_pct",  "total_population"),
        ("born_overseas",     "born_overseas_pct",           "total_population"),
    ]:
        if count_col in demo.columns and denom in demo.columns:
            demo[pct_col] = safe_pct(demo[count_col], demo[denom]).round(4)
        else:
            demo[pct_col] = None

    # Placeholder cols not computable from Census alone
    demo["families_with_children_pct"] = None
    demo["single_parent_families_pct"] = None
    demo["census_year"] = 2021

    # Ensure all expected columns exist (some may be None if a table was missing)
    for missing_col in ["median_age", "median_household_income", "median_personal_income",
                        "born_overseas_pct", "speaks_english_only_pct",
                        "indigenous_population_pct"]:
        if missing_col not in demo.columns:
            demo[missing_col] = None

    demo_out = demo[[
        "sa2_code", "total_population", "median_age",
        "median_household_income", "median_personal_income",
        "born_overseas_pct", "speaks_english_only_pct",
        "indigenous_population_pct", "families_with_children_pct",
        "single_parent_families_pct", "census_year",
    ]].copy()
    demo_out = demo_out[demo_out["sa2_code"].isin(valid_sa2s)]
    demo_out.to_csv(PROCESSED_DIR / "demographics.csv", index=False)
    print(f"[OUT] demographics.csv — {len(demo_out)} rows")

    # ── Housing table
    housing = g33.copy()
    if not g02.empty:
        housing = housing.merge(
            g02[["sa2_code", "median_rent_weekly", "median_mortgage_monthly"]],
            on="sa2_code", how="left",
        )
    housing["median_house_price"] = None  # Not in Census; future: CoreLogic
    housing = housing[housing["sa2_code"].isin(valid_sa2s)]
    housing[[
        "sa2_code", "median_house_price", "median_rent_weekly",
        "median_mortgage_monthly", "owner_occupied_pct",
        "renting_pct", "social_housing_pct", "total_dwellings",
    ]].to_csv(PROCESSED_DIR / "housing.csv", index=False)
    print(f"[OUT] housing.csv — {len(housing)} rows")

    # ── Age distribution
    age_out = g04[g04["sa2_code"].isin(valid_sa2s)]
    age_out.to_csv(PROCESSED_DIR / "age_distribution.csv", index=False)
    print(f"[OUT] age_distribution.csv — {len(age_out)} rows")

    print("\n" + "=" * 50)
    print("✓ Processing complete.  Run import_to_d1.py next.")


if __name__ == "__main__":
    main()
