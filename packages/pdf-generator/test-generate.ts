/**
 * Local smoke test for the PDF generator.
 * Run: pnpm test
 * Writes test-output-single.pdf, test-output-professional.pdf, test-output-enterprise.pdf
 */

import { writeFileSync } from "node:fs";
import { generateFeasibilityReport, generateComparisonReport, generateEnterpriseReport } from "./dist/index.js";
import type { ReportData } from "./dist/index.js";

const BOX_HILL: ReportData = {
  sa2Code: "207031163",
  suburb: "Box Hill",
  state: "VIC",
  postcode: "3128",
  lga: "Whitehorse",
  demographics: {
    totalPopulation: 22841,
    medianAge: 34,
    medianHouseholdIncome: 1441,
    medianPersonalIncome: 728,
    ageDistribution: {
      "0_4":    0.053,
      "5_14":   0.103,
      "15_24":  0.138,
      "25_34":  0.189,
      "35_44":  0.148,
      "45_54":  0.121,
      "55_64":  0.098,
      "65_74":  0.082,
      "75_plus":0.068,
    },
    bornOverseas:        0.61,
    speaksEnglishOnly:   0.32,
    indigenousPopulation:0.003,
    familiesWithChildren:0.41,
    singleParentFamilies:0.12,
    topLanguages: [
      { language: "Mandarin",   count: 4210, pct: 0.184 },
      { language: "Cantonese",  count: 2950, pct: 0.129 },
      { language: "Vietnamese", count:  870, pct: 0.038 },
      { language: "Greek",      count:  540, pct: 0.024 },
      { language: "Hindi",      count:  430, pct: 0.019 },
    ],
  },
  seifa: {
    irsd: 991,  irsdDecile: 4,
    irsad: 1041, irsadDecile: 7,
    ier: 928,   ierDecile: 2,
    ieo: 1096,  ieoDecile: 9,
  },
  housing: {
    medianHousePrice:      null,
    medianRentWeekly:      391,
    medianMortgageMonthly: 2088,
    ownerOccupied:         0.58,
    renting:               0.37,
    socialHousing:         0.03,
    totalDwellings:        36355,
  },
  censusYear: 2021,
  generatedAt: new Date().toISOString(),
};

const NEIGHBOUR_1: ReportData = {
  ...BOX_HILL,
  sa2Code: "207031164",
  suburb: "Box Hill North",
  demographics: { ...BOX_HILL.demographics, totalPopulation: 18200, medianAge: 38 },
  seifa: { irsd: 1020, irsdDecile: 6, irsad: 1055, irsadDecile: 8, ier: 960, ierDecile: 4, ieo: 1080, ieoDecile: 8 },
};

const NEIGHBOUR_2: ReportData = {
  ...BOX_HILL,
  sa2Code: "207031165",
  suburb: "Mont Albert",
  demographics: { ...BOX_HILL.demographics, totalPopulation: 9400, medianAge: 42 },
  seifa: { irsd: 1080, irsdDecile: 8, irsad: 1090, irsadDecile: 9, ier: 1050, ierDecile: 8, ieo: 1110, ieoDecile: 10 },
};

async function run() {
  console.log("Generating Single report...");
  const single = await generateFeasibilityReport(BOX_HILL);
  writeFileSync("test-output-single.pdf", single.buffer);
  console.log(`  ✓ ${single.filename} (${(single.buffer.length / 1024).toFixed(1)} KB)`);

  console.log("Generating Professional report...");
  const pro = await generateComparisonReport(BOX_HILL, [NEIGHBOUR_1, NEIGHBOUR_2]);
  writeFileSync("test-output-professional.pdf", pro.buffer);
  console.log(`  ✓ ${pro.filename} (${(pro.buffer.length / 1024).toFixed(1)} KB)`);

  console.log("Generating Enterprise report...");
  const ent = await generateEnterpriseReport(BOX_HILL, [NEIGHBOUR_1, NEIGHBOUR_2]);
  writeFileSync("test-output-enterprise.pdf", ent.buffer);
  console.log(`  ✓ ${ent.filename} (${(ent.buffer.length / 1024).toFixed(1)} KB)`);

  console.log("\nAll 3 reports generated successfully.");
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
