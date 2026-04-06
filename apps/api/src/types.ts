/**
 * Raw row returned by D1 when we JOIN all ABS tables for a single SA2.
 * Column names mirror the SQL aliases in db.ts queries.
 */
export interface SuburbRow {
  // sa2_areas
  sa2_code: string;
  suburb: string;
  state: string;
  lga_code: string | null;
  lga_name: string | null;

  // postcode (may be null if no direct mapping)
  postcode: string | null;

  // demographics
  total_population: number | null;
  median_age: number | null;
  median_household_income: number | null;
  median_personal_income: number | null;
  born_overseas_pct: number | null;
  speaks_english_only_pct: number | null;
  indigenous_population_pct: number | null;
  families_with_children_pct: number | null;
  single_parent_families_pct: number | null;
  census_year: number;

  // seifa_scores
  irsd_score: number | null;
  irsd_decile: number | null;
  irsad_score: number | null;
  irsad_decile: number | null;
  ier_score: number | null;
  ier_decile: number | null;
  ieo_score: number | null;
  ieo_decile: number | null;

  // housing
  median_house_price: number | null;
  median_rent_weekly: number | null;
  median_mortgage_monthly: number | null;
  owner_occupied_pct: number | null;
  renting_pct: number | null;
  social_housing_pct: number | null;
  total_dwellings: number | null;

  // age_distribution
  age_0_4_pct: number | null;
  age_5_14_pct: number | null;
  age_15_24_pct: number | null;
  age_25_34_pct: number | null;
  age_35_44_pct: number | null;
  age_45_54_pct: number | null;
  age_55_64_pct: number | null;
  age_65_74_pct: number | null;
  age_75_plus_pct: number | null;
}

export interface LanguageRow {
  sa2_code: string;
  language: string;
  count: number;
  pct: number;
}

/** Serialised API response shape — aligns with @abs/data SuburbData type. */
export interface SuburbResponse {
  sa2Code: string;
  suburb: string;
  state: string;
  postcode: string | null;
  lga: string | null;
  demographics: {
    totalPopulation: number | null;
    medianAge: number | null;
    medianHouseholdIncome: number | null;
    medianPersonalIncome: number | null;
    ageDistribution: {
      "0_4": number | null;
      "5_14": number | null;
      "15_24": number | null;
      "25_34": number | null;
      "35_44": number | null;
      "45_54": number | null;
      "55_64": number | null;
      "65_74": number | null;
      "75_plus": number | null;
    };
    bornOverseas: number | null;
    speaksEnglishOnly: number | null;
    indigenousPopulation: number | null;
    familiesWithChildren: number | null;
    singleParentFamilies: number | null;
    topLanguages: { language: string; count: number; pct: number }[];
  };
  seifa: {
    irsad: number | null;
    irsd: number | null;
    ier: number | null;
    ieo: number | null;
    irsadDecile: number | null;
    irsdDecile: number | null;
    ierDecile: number | null;
    ieoDecile: number | null;
  };
  housing: {
    medianHousePrice: number | null;
    medianRentWeekly: number | null;
    medianMortgageMonthly: number | null;
    ownerOccupied: number | null;
    renting: number | null;
    socialHousing: number | null;
    totalDwellings: number | null;
  };
  censusYear: number;
  lastUpdated: string;
}
