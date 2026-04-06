/** Mirrors apps/api/src/types.ts SuburbResponse — kept in sync manually. */
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
