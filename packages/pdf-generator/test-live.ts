/**
 * Live integration test: fetch real data from the API then generate a PDF locally.
 *
 * Usage:
 *   pnpm test:live                          # defaults: postcode=3128, plan=single
 *   pnpm test:live -- --postcode 5065
 *   pnpm test:live -- --suburb "box hill"
 *   pnpm test:live -- --postcode 5065 --plan professional
 *   pnpm test:live -- --postcode 5065 --plan enterprise
 */

import { writeFileSync } from "node:fs";
import { generateFeasibilityReport, generateComparisonReport, generateEnterpriseReport } from "./dist/index.js";
import type { ReportData } from "./dist/index.js";

const API_URL = process.env.API_URL ?? "https://api.workswell.com.au";

// ── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const postcode = flag("postcode", "");
const suburb   = flag("suburb", "");
const plan     = flag("plan", "single") as "single" | "professional" | "enterprise";

if (!postcode && !suburb) {
  console.log("No args provided — using default: postcode=3128 (Box Hill VIC)");
}

// ── Fetch suburb data ─────────────────────────────────────────────────────────

type SuburbResponse = {
  sa2Code: string; suburb: string; state: string; postcode: string | null; lga: string | null;
  demographics: ReportData["demographics"];
  seifa: ReportData["seifa"];
  housing: ReportData["housing"];
  censusYear: number;
};

async function fetchSuburbs(): Promise<SuburbResponse[]> {
  const param = postcode || "3128";
  const path  = postcode
    ? `/api/data/postcode/${encodeURIComponent(postcode || "3128")}`
    : `/api/data/suburb/${encodeURIComponent(suburb)}`;

  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: SuburbResponse[] };
  if (!json.data?.length) throw new Error(`No results for ${postcode ? `postcode ${param}` : `suburb "${suburb}"`}`);
  return json.data;
}

function toReportData(r: SuburbResponse): ReportData {
  return {
    sa2Code:    r.sa2Code,
    suburb:     r.suburb,
    state:      r.state,
    postcode:   r.postcode,
    lga:        r.lga,
    demographics: r.demographics,
    seifa:      r.seifa,
    housing:    r.housing,
    censusYear: r.censusYear,
    generatedAt: new Date().toISOString(),
  };
}

// ── Get neighbouring SA2s (same approach as the Worker) ──────────────────────

async function fetchNeighbours(primary: SuburbResponse, count: number): Promise<SuburbResponse[]> {
  // Use adjacent SA2 codes within the same state (same heuristic as the Worker)
  const code = parseInt(primary.sa2Code);
  const candidates: SuburbResponse[] = [];

  for (let delta = 1; candidates.length < count && delta <= 20; delta++) {
    for (const offset of [delta, -delta]) {
      const candidate = String(code + offset).padStart(9, "0");
      try {
        const res = await fetch(`${API_URL}/api/data/suburb/${encodeURIComponent(candidate)}`);
        if (!res.ok) continue;
        const json = await res.json() as { data: SuburbResponse[] };
        const match = json.data?.find(r => r.sa2Code === candidate && r.state === primary.state);
        if (match) { candidates.push(match); break; }
      } catch { /* skip */ }
    }
    if (candidates.length >= count) break;
  }
  return candidates.slice(0, count);
}

// ── Generate ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`Fetching data from ${API_URL}…`);
  const results = await fetchSuburbs();
  const primary = results[0];
  console.log(`  Found: ${primary.suburb} (${primary.state}) · SA2 ${primary.sa2Code} · pop ${primary.demographics.totalPopulation ?? "N/A"}`);
  if (results.length > 1) {
    console.log(`  (${results.length - 1} other SA2s for this postcode — using first)`);
  }

  let buffer: Uint8Array;
  let filename: string;

  if (plan === "professional") {
    console.log("Fetching 2 neighbouring SA2s…");
    const neighbours = await fetchNeighbours(primary, 2);
    neighbours.forEach(n => console.log(`  Neighbour: ${n.suburb} (${n.state})`));
    const result = await generateComparisonReport(toReportData(primary), neighbours.map(toReportData));
    buffer = result.buffer; filename = result.filename;

  } else if (plan === "enterprise") {
    console.log("Fetching 3 neighbouring SA2s…");
    const neighbours = await fetchNeighbours(primary, 3);
    neighbours.forEach(n => console.log(`  Neighbour: ${n.suburb} (${n.state})`));
    const result = await generateEnterpriseReport(toReportData(primary), neighbours.map(toReportData));
    buffer = result.buffer; filename = result.filename;

  } else {
    const result = await generateFeasibilityReport(toReportData(primary));
    buffer = result.buffer; filename = result.filename;
  }

  const slug = primary.suburb.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const param = postcode ? `pc${postcode}` : `s${slug}`;
  const outFile = `test-live-${param}-${plan}-${ts}.pdf`;
  writeFileSync(outFile, buffer);
  console.log(`\n✓ ${plan} report generated: ${outFile} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
