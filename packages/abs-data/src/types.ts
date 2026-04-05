export interface AgeDistribution {
  "0_4": number;
  "5_14": number;
  "15_24": number;
  "25_34": number;
  "35_44": number;
  "45_54": number;
  "55_64": number;
  "65_74": number;
  "75_plus": number;
}

export interface SeifaScores {
  irsad: number; // Index of Relative Socio-economic Advantage and Disadvantage
  irsd: number;  // Index of Relative Socio-economic Disadvantage
  ier: number;   // Index of Economic Resources
  ieo: number;   // Index of Education and Occupation
  irsadDecile: number;
  irsdDecile: number;
}

export interface HousingData {
  medianHousePrice: number | null;
  medianRent: number | null;
  ownerOccupied: number;
  renting: number;
  socialHousing: number;
  totalDwellings: number;
}

export interface Demographics {
  totalPopulation: number;
  medianAge: number;
  medianHouseholdIncome: number | null;
  ageDistribution: AgeDistribution;
  bornOverseas: number;
  speaksEnglishOnly: number;
  indigenousPopulation: number;
  familiesWithChildren: number;
  singleParentFamilies: number;
}

export interface SuburbData {
  suburb: string;
  state: string;
  postcode: string;
  lga: string;
  demographics: Demographics;
  seifa: SeifaScores;
  housing: HousingData;
  censusYear: number;
  lastUpdated: string;
}
