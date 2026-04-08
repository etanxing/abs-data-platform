/**
 * Font comparison: generates one full report PDF per font (all static TTF).
 * Run: pnpm test:fonts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setFontBuffers, generateFeasibilityReport } from "./dist/index.js";
import type { ReportData } from "./dist/index.js";

const API_URL = "https://api.workswell.com.au";
const fontsDir = fileURLToPath(new URL("fonts", import.meta.url));
const ttf = (name: string): Uint8Array => readFileSync(`${fontsDir}/${name}`);

// ── Font options (all static TTF — no variable fonts to avoid ligature bugs) ──

const FONTS = [
  {
    name: "Lato",
    bufs: { regular: ttf("lato-regular.ttf"), bold: ttf("lato-bold.ttf"), italic: ttf("lato-italic.ttf"), boldObl: ttf("lato-bolditalic.ttf") },
  },
  {
    name: "Inter",
    bufs: { regular: ttf("inter-regular.ttf"), bold: ttf("inter-bold.ttf"), italic: ttf("inter-italic.ttf"), boldObl: ttf("inter-bolditalic.ttf") },
  },
  {
    name: "Source Sans 3",
    bufs: { regular: ttf("source-sans-regular.ttf"), bold: ttf("source-sans-bold.ttf"), italic: ttf("source-sans-italic.ttf"), boldObl: ttf("source-sans-bolditalic.ttf") },
  },
  {
    name: "DM Sans",
    bufs: { regular: ttf("dm-sans-regular.ttf"), bold: ttf("dm-sans-bold.ttf"), italic: ttf("dm-sans-italic.ttf"), boldObl: ttf("dm-sans-bolditalic.ttf") },
  },
];

// ── Fetch data ────────────────────────────────────────────────────────────────

async function fetchData(suburb: string): Promise<ReportData> {
  const res = await fetch(`${API_URL}/api/data/suburb/${encodeURIComponent(suburb)}`);
  const json = await res.json() as { data: any[] };
  const r = json.data.find((r: any) => r.state === "VIC") ?? json.data[0];
  return { ...r, generatedAt: new Date().toISOString() };
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log("Fetching Box Hill (VIC) data...");
  const data = await fetchData("box hill");
  console.log(`  ${data.suburb}, ${data.state} · pop ${data.demographics.totalPopulation?.toLocaleString("en-AU")}\n`);

  for (const { name, bufs } of FONTS) {
    console.log(`Generating: ${name}...`);
    setFontBuffers(bufs);
    const result = await generateFeasibilityReport(data);
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const outFile = `test-font-${slug}.pdf`;
    writeFileSync(outFile, result.buffer);
    console.log(`  → ${outFile} (${(result.buffer.length / 1024).toFixed(1)} KB)\n`);
  }

  // Reset to default (Lato from disk)
  setFontBuffers(null);
  console.log("Done. Open PDFs side-by-side to compare.");
}

run().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
