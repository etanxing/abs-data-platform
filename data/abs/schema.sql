-- ABS Data Platform - D1 Schema
-- Census 2021, SEIFA 2021 (NSW + VIC MVP)
-- Note: PRAGMA statements omitted — D1 does not support them

-- ─────────────────────────────────────────────
-- Core geography table (SA2 areas)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sa2_areas (
    sa2_code     TEXT PRIMARY KEY,  -- 9-digit SA2 code (2021 ASGS Edition 3)
    sa2_name     TEXT NOT NULL,
    state_code   TEXT NOT NULL,     -- '1'=NSW, '2'=VIC, etc.
    state_name   TEXT NOT NULL,     -- 'NSW', 'VIC', etc.
    lga_code     TEXT,
    lga_name     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sa2_areas_name       ON sa2_areas (sa2_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_sa2_areas_state_code ON sa2_areas (state_code);

-- ─────────────────────────────────────────────
-- Postcode → SA2 mapping (one postcode can span multiple SA2s)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS postcode_sa2_mapping (
    postcode  TEXT NOT NULL,
    sa2_code  TEXT NOT NULL,
    ratio     REAL NOT NULL DEFAULT 1.0,  -- fraction of postcode population in this SA2
    PRIMARY KEY (postcode, sa2_code),
    FOREIGN KEY (sa2_code) REFERENCES sa2_areas (sa2_code)
);

CREATE INDEX IF NOT EXISTS idx_psm_postcode ON postcode_sa2_mapping (postcode);
CREATE INDEX IF NOT EXISTS idx_psm_sa2_code ON postcode_sa2_mapping (sa2_code);

-- ─────────────────────────────────────────────
-- Demographics (Census 2021)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demographics (
    sa2_code                    TEXT PRIMARY KEY,
    total_population            INTEGER,
    median_age                  REAL,
    median_household_income     INTEGER,     -- weekly household income (AUD)
    median_personal_income      INTEGER,     -- weekly personal income (AUD)
    born_overseas_pct           REAL,        -- 0.0–1.0
    speaks_english_only_pct     REAL,        -- 0.0–1.0
    indigenous_population_pct   REAL,        -- 0.0–1.0
    families_with_children_pct  REAL,        -- 0.0–1.0 of all families
    single_parent_families_pct  REAL,        -- 0.0–1.0 of families with children
    census_year                 INTEGER NOT NULL DEFAULT 2021,
    FOREIGN KEY (sa2_code) REFERENCES sa2_areas (sa2_code)
);

-- ─────────────────────────────────────────────
-- SEIFA 2021 scores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seifa_scores (
    sa2_code       TEXT PRIMARY KEY,
    irsd_score     INTEGER,  -- Index of Relative Socio-economic Disadvantage
    irsd_decile    INTEGER,
    irsad_score    INTEGER,  -- Index of Relative Socio-economic Advantage and Disadvantage
    irsad_decile   INTEGER,
    ier_score      INTEGER,  -- Index of Economic Resources
    ier_decile     INTEGER,
    ieo_score      INTEGER,  -- Index of Education and Occupation
    ieo_decile     INTEGER,
    usual_resident_population INTEGER,
    FOREIGN KEY (sa2_code) REFERENCES sa2_areas (sa2_code)
);

-- ─────────────────────────────────────────────
-- Housing (Census 2021 G02, G33, G36)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS housing (
    sa2_code             TEXT PRIMARY KEY,
    median_house_price   INTEGER,   -- NULL (not in Census; future: CoreLogic)
    median_rent_weekly   INTEGER,   -- from Census G02
    median_mortgage_monthly INTEGER, -- from Census G02
    owner_occupied_pct   REAL,      -- 0.0–1.0 (outright + mortgage)
    renting_pct          REAL,      -- 0.0–1.0
    social_housing_pct   REAL,      -- 0.0–1.0 (state/community housing)
    total_dwellings      INTEGER,
    FOREIGN KEY (sa2_code) REFERENCES sa2_areas (sa2_code)
);

-- ─────────────────────────────────────────────
-- Age distribution (Census 2021 G04)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS age_distribution (
    sa2_code        TEXT PRIMARY KEY,
    age_0_4_pct     REAL,
    age_5_14_pct    REAL,
    age_15_24_pct   REAL,
    age_25_34_pct   REAL,
    age_35_44_pct   REAL,
    age_45_54_pct   REAL,
    age_55_64_pct   REAL,
    age_65_74_pct   REAL,
    age_75_plus_pct REAL,
    FOREIGN KEY (sa2_code) REFERENCES sa2_areas (sa2_code)
);

-- ─────────────────────────────────────────────
-- Language diversity (Census 2021 G51) — top languages per SA2
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS language_diversity (
    sa2_code TEXT    NOT NULL,
    language TEXT    NOT NULL,
    count    INTEGER NOT NULL,
    pct      REAL    NOT NULL,
    PRIMARY KEY (sa2_code, language),
    FOREIGN KEY (sa2_code) REFERENCES sa2_areas (sa2_code)
);

CREATE INDEX IF NOT EXISTS idx_lang_sa2 ON language_diversity (sa2_code);
