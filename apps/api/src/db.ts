import type { SuburbRow, LanguageRow, SuburbResponse } from "./types";

// ──────────────────────────────────────────────────────────────
// SQL — full suburb JOIN across all ABS tables
// ──────────────────────────────────────────────────────────────

const SUBURB_SELECT = `
  SELECT
    s.sa2_code,
    s.sa2_name    AS suburb,
    s.state_name  AS state,
    s.lga_code,
    s.lga_name,
    pm.postcode,
    d.total_population,
    d.median_age,
    d.median_household_income,
    d.median_personal_income,
    d.born_overseas_pct,
    d.speaks_english_only_pct,
    d.indigenous_population_pct,
    d.families_with_children_pct,
    d.single_parent_families_pct,
    COALESCE(d.census_year, 2021)  AS census_year,
    se.irsd_score,  se.irsd_decile,
    se.irsad_score, se.irsad_decile,
    se.ier_score,   se.ier_decile,
    se.ieo_score,   se.ieo_decile,
    h.median_house_price,
    h.median_rent_weekly,
    h.median_mortgage_monthly,
    h.owner_occupied_pct,
    h.renting_pct,
    h.social_housing_pct,
    h.total_dwellings,
    a.age_0_4_pct,   a.age_5_14_pct,  a.age_15_24_pct,
    a.age_25_34_pct, a.age_35_44_pct, a.age_45_54_pct,
    a.age_55_64_pct, a.age_65_74_pct, a.age_75_plus_pct
  FROM sa2_areas s
  LEFT JOIN demographics     d  ON s.sa2_code = d.sa2_code
  LEFT JOIN seifa_scores     se ON s.sa2_code = se.sa2_code
  LEFT JOIN housing          h  ON s.sa2_code = h.sa2_code
  LEFT JOIN age_distribution a  ON s.sa2_code = a.sa2_code
  LEFT JOIN (
    SELECT sa2_code, MIN(postcode) AS postcode
    FROM postcode_sa2_mapping
    GROUP BY sa2_code
  ) pm ON s.sa2_code = pm.sa2_code
`.trim();

export const QUERY_BY_SUBURB = `
  ${SUBURB_SELECT}
  WHERE s.sa2_code IN (
    SELECT DISTINCT sa2_code FROM suburb_sa2_mapping WHERE suburb_name LIKE ? COLLATE NOCASE
    UNION
    SELECT sa2_code FROM sa2_areas WHERE sa2_name LIKE ? COLLATE NOCASE
  )
  ORDER BY s.sa2_name
  LIMIT 20
`;

export const QUERY_BY_POSTCODE = `
  ${SUBURB_SELECT}
  INNER JOIN postcode_sa2_mapping pcm ON s.sa2_code = pcm.sa2_code
  WHERE pcm.postcode = ?
  ORDER BY s.sa2_name
  LIMIT 20
`;

export const QUERY_LANGUAGES = `
  SELECT sa2_code, language, count, pct
  FROM language_diversity
  WHERE sa2_code IN (SELECT value FROM json_each(?))
  ORDER BY sa2_code, count DESC
`;

// ──────────────────────────────────────────────────────────────
// Shape D1 rows → API response
// ──────────────────────────────────────────────────────────────

function buildResponse(
  row: SuburbRow,
  languages: LanguageRow[],
): SuburbResponse {
  const topLanguages = languages
    .filter((l) => l.sa2_code === row.sa2_code)
    .map((l) => ({ language: l.language, count: l.count, pct: l.pct }));

  return {
    sa2Code:  row.sa2_code,
    suburb:   row.suburb,
    state:    row.state,
    postcode: row.postcode ?? null,
    lga:      row.lga_name ?? null,
    demographics: {
      totalPopulation:       row.total_population,
      medianAge:             row.median_age,
      medianHouseholdIncome: row.median_household_income,
      medianPersonalIncome:  row.median_personal_income,
      ageDistribution: {
        "0_4":    row.age_0_4_pct,
        "5_14":   row.age_5_14_pct,
        "15_24":  row.age_15_24_pct,
        "25_34":  row.age_25_34_pct,
        "35_44":  row.age_35_44_pct,
        "45_54":  row.age_45_54_pct,
        "55_64":  row.age_55_64_pct,
        "65_74":  row.age_65_74_pct,
        "75_plus":row.age_75_plus_pct,
      },
      bornOverseas:          row.born_overseas_pct,
      speaksEnglishOnly:     row.speaks_english_only_pct,
      indigenousPopulation:  row.indigenous_population_pct,
      familiesWithChildren:  row.families_with_children_pct,
      singleParentFamilies:  row.single_parent_families_pct,
      topLanguages,
    },
    seifa: {
      irsad:       row.irsad_score,
      irsd:        row.irsd_score,
      ier:         row.ier_score,
      ieo:         row.ieo_score,
      irsadDecile: row.irsad_decile,
      irsdDecile:  row.irsd_decile,
      ierDecile:   row.ier_decile,
      ieoDecile:   row.ieo_decile,
    },
    housing: {
      medianHousePrice:     row.median_house_price,
      medianRentWeekly:     row.median_rent_weekly,
      medianMortgageMonthly:row.median_mortgage_monthly,
      ownerOccupied:        row.owner_occupied_pct,
      renting:              row.renting_pct,
      socialHousing:        row.social_housing_pct,
      totalDwellings:       row.total_dwellings,
    },
    censusYear:  row.census_year ?? 2021,
    lastUpdated: new Date().toISOString().split("T")[0],
  };
}

// ──────────────────────────────────────────────────────────────
// Public query helpers
// ──────────────────────────────────────────────────────────────

export async function querySuburbs(
  db: D1Database,
  param: string,
  byPostcode: boolean,
): Promise<SuburbResponse[]> {
  const sql = byPostcode ? QUERY_BY_POSTCODE : QUERY_BY_SUBURB;
  const bindParam = byPostcode ? param : `%${param}%`;

  // QUERY_BY_SUBURB has two ? placeholders (suburb_sa2_mapping + sa2_areas)
  const bindings: string[] = byPostcode ? [bindParam] : [bindParam, bindParam];

  const { results } = await db
    .prepare(sql)
    .bind(...bindings)
    .all<SuburbRow>();

  if (!results || results.length === 0) return [];

  const sa2Codes = results.map((r) => r.sa2_code);

  // Fetch languages for all returned SA2s in one query
  const { results: langRows } = await db
    .prepare(QUERY_LANGUAGES)
    .bind(JSON.stringify(sa2Codes))
    .all<LanguageRow>();

  const languages = langRows ?? [];
  return results.map((row) => buildResponse(row, languages));
}
