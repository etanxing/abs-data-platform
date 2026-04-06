#!/usr/bin/env python3
"""
Download raw ABS datasets for the abs-data-platform.

Fetches:
  - SEIFA 2021 SA2 (Excel) — scores and deciles
  - ASGS Postcode-to-SA2 2021 correspondence (CSV)
  - Census 2021 GCP DataPacks for NSW and VIC (SA2, short-header, ZIP)

Files land in data/abs/raw/.  Re-running skips already-downloaded files.

Usage:
    pip install -r requirements.txt
    python download_abs_data.py

ABS DataPack note:
  The Census 2021 GCP SA2 zips are ~80–120 MB each.  If the automated
  download fails (ABS sometimes blocks bots), download manually from:
    https://www.abs.gov.au/census/find-census-data/datapacks
  Select: 2021 → General Community Profile → SA2 → NSW (or VIC)
  and place the zip in data/abs/raw/ with the filename shown below.
"""

import sys
import zipfile
import requests
from pathlib import Path
from tqdm import tqdm

RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────────────────────
# Download manifest
# ──────────────────────────────────────────────────────────────
DOWNLOADS = [
    {
        "key": "seifa_2021_sa2",
        "description": "SEIFA 2021 — SA2 scores and deciles (Excel)",
        "url": (
            "https://www.abs.gov.au/statistics/people/people-and-communities"
            "/socio-economic-indexes-areas-seifa-australia/2021"
            "/Statistical%20Area%20Level%202%2C%20Indexes%2C%20SEIFA%202021.xlsx"
        ),
        "filename": "SEIFA_2021_SA2.xlsx",
        "extract": False,
    },
    {
        "key": "postcode_sa2_correspondence",
        "description": "ASGS 2021 Postcode → SA2 correspondence (CSV)",
        "url": (
            "https://www.abs.gov.au/statistics/standards"
            "/australian-statistical-geography-standard-asgs-edition-3"
            "/jul2021-jun2026/access-and-downloads/correspondences"
            "/CG_POSTCODE_2021_SA2_2021.csv"
        ),
        "filename": "CG_POSTCODE_2021_SA2_2021.csv",
        "extract": False,
    },
    {
        "key": "census_gcp_nsw_sa2",
        "description": "Census 2021 GCP SA2 NSW short-header ZIP (~100 MB)",
        "url": (
            "https://www.abs.gov.au/census/find-census-data/datapacks/download"
            "/2021_GCP_SA2_for_NSW_short-header.zip"
        ),
        "filename": "2021_GCP_SA2_NSW.zip",
        "extract": True,
        "extract_dir": "census_NSW",
    },
    {
        "key": "census_gcp_vic_sa2",
        "description": "Census 2021 GCP SA2 VIC short-header ZIP (~80 MB)",
        "url": (
            "https://www.abs.gov.au/census/find-census-data/datapacks/download"
            "/2021_GCP_SA2_for_VIC_short-header.zip"
        ),
        "filename": "2021_GCP_SA2_VIC.zip",
        "extract": True,
        "extract_dir": "census_VIC",
    },
]


def download_file(url: str, dest: Path, description: str) -> bool:
    """Stream-download url → dest with a tqdm progress bar.  Returns True on success."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (abs-data-platform/1.0; "
            "+https://github.com/etanxing/abs-data-platform)"
        )
    }
    try:
        resp = requests.get(url, headers=headers, stream=True, timeout=60)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"  ✗ Download failed: {exc}")
        return False

    total = int(resp.headers.get("content-length", 0))
    with (
        open(dest, "wb") as fh,
        tqdm(
            total=total,
            unit="B",
            unit_scale=True,
            desc=dest.name,
            leave=False,
        ) as bar,
    ):
        for chunk in resp.iter_content(chunk_size=65536):
            fh.write(chunk)
            bar.update(len(chunk))
    return True


def extract_zip(zip_path: Path, extract_dir: Path) -> None:
    """Extract a zip, skipping if the target directory already has files."""
    if extract_dir.exists() and any(extract_dir.iterdir()):
        print(f"  → Already extracted to {extract_dir.relative_to(RAW_DIR.parent)}")
        return
    extract_dir.mkdir(parents=True, exist_ok=True)
    print(f"  → Extracting to {extract_dir.relative_to(RAW_DIR.parent)} …")
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)
    print(f"  ✓ Extracted {len(zf.namelist())} files")


def main() -> None:
    print("ABS Data Downloader\n" + "=" * 50)
    errors: list[str] = []

    for item in DOWNLOADS:
        dest = RAW_DIR / item["filename"]
        print(f"\n[{item['key']}] {item['description']}")

        if dest.exists():
            size_mb = dest.stat().st_size / 1_048_576
            print(f"  → Already downloaded ({size_mb:.1f} MB) — skipping")
        else:
            print(f"  → Downloading from ABS …")
            ok = download_file(item["url"], dest, item["description"])
            if not ok:
                errors.append(item["key"])
                print(f"  ✗ FAILED — manual download instructions above")
                continue
            size_mb = dest.stat().st_size / 1_048_576
            print(f"  ✓ Saved ({size_mb:.1f} MB)")

        if item.get("extract"):
            extract_zip(dest, RAW_DIR / item["extract_dir"])

    print("\n" + "=" * 50)
    if errors:
        print(f"⚠ {len(errors)} download(s) failed: {', '.join(errors)}")
        print("  Place files manually in data/abs/raw/ and re-run.")
        sys.exit(1)
    else:
        print("✓ All files ready.  Run process_abs_data.py next.")


if __name__ == "__main__":
    main()
