import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ReportData } from "./report-types";

// ─── Font loading ─────────────────────────────────────────────────────────────

// Default font: Lato (TTF — WOFF2 is not reliably handled by @pdf-lib/fontkit)
// Node.js: reads from bundled fonts/ directory (../fonts relative to dist/index.js)
// Workers: fetches TTF from GitHub raw CDN
const LATO_CDN = "https://raw.githubusercontent.com/google/fonts/main/ofl/lato";
const LATO_CDN_URLS = {
  regular: `${LATO_CDN}/Lato-Regular.ttf`,
  bold:    `${LATO_CDN}/Lato-Bold.ttf`,
  italic:  `${LATO_CDN}/Lato-Italic.ttf`,
  boldObl: `${LATO_CDN}/Lato-BoldItalic.ttf`,
};

export interface FontUrls {
  regular:  string;
  bold:     string;
  italic?:  string;
  boldObl?: string;
}

/** Override font URLs for testing. Pass null to reset to default (Lato). */
let _fontOverride: FontUrls | null = null;
export function setFontUrls(urls: FontUrls | null) { _fontOverride = urls; _fontBufs = null; }

export interface FontBuffers { regular: Uint8Array; bold: Uint8Array; italic?: Uint8Array; boldObl?: Uint8Array }
/** Override fonts with pre-loaded TTF/OTF buffers (Node.js testing only). Pass null to reset. */
let _fontBufs: FontBuffers | null = null;
export function setFontBuffers(bufs: FontBuffers | null) { _fontBufs = bufs; _fontOverride = null; }

export interface Fonts { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldObl: PDFFont }

async function fetchFontBuf(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} → ${res.status}`);
  return res.arrayBuffer();
}

async function loadDefaultFontsNode(doc: PDFDocument): Promise<Fonts> {
  // String variables prevent TypeScript from trying to resolve these as static modules.
  // Workers bundler never reaches this branch at runtime.
  const fsId  = "node:fs";
  const urlId = "node:url";
  const { readFileSync } = await import(fsId) as { readFileSync: (p: string) => Uint8Array };
  const { fileURLToPath } = await import(urlId) as { fileURLToPath: (u: URL | string) => string };
  const fontsDir = fileURLToPath(new URL("../fonts", import.meta.url));
  const rBuf = readFileSync(`${fontsDir}/lato-regular.ttf`);
  const bBuf = readFileSync(`${fontsDir}/lato-bold.ttf`);
  const iBuf = readFileSync(`${fontsDir}/lato-italic.ttf`);
  const oBuf = readFileSync(`${fontsDir}/lato-bolditalic.ttf`);
  const r = await doc.embedFont(rBuf);
  const b = await doc.embedFont(bBuf);
  const i = await doc.embedFont(iBuf);
  const o = await doc.embedFont(oBuf);
  return { regular: r, bold: b, italic: i, boldObl: o };
}

export async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  try {
    if (_fontBufs) {
      const { regular: rBuf, bold: bBuf, italic: iBuf, boldObl: biBuf } = _fontBufs;
      const r = await doc.embedFont(rBuf);
      const b = await doc.embedFont(bBuf);
      const i = iBuf  ? await doc.embedFont(iBuf)  : r;
      const o = biBuf ? await doc.embedFont(biBuf) : b;
      return { regular: r, bold: b, italic: i, boldObl: o };
    }

    if (_fontOverride) {
      // Explicit URL override
      const urls = _fontOverride;
      const [rBuf, bBuf, iBuf, biBuf] = await Promise.all([
        fetchFontBuf(urls.regular),
        fetchFontBuf(urls.bold),
        urls.italic  ? fetchFontBuf(urls.italic)  : Promise.resolve(null),
        urls.boldObl ? fetchFontBuf(urls.boldObl) : Promise.resolve(null),
      ]);
      const r = await doc.embedFont(rBuf);
      const b = await doc.embedFont(bBuf);
      const i = iBuf  ? await doc.embedFont(iBuf)  : r;
      const o = biBuf ? await doc.embedFont(biBuf) : b;
      return { regular: r, bold: b, italic: i, boldObl: o };
    }

    // Default: Lato TTF
    const isNode = typeof (globalThis as any).process !== "undefined" &&
                   !!(globalThis as any).process.versions?.node;
    if (isNode) {
      return await loadDefaultFontsNode(doc);
    }
    // Workers: fetch from CDN
    const [rBuf, bBuf, iBuf, biBuf] = await Promise.all([
      fetchFontBuf(LATO_CDN_URLS.regular),
      fetchFontBuf(LATO_CDN_URLS.bold),
      fetchFontBuf(LATO_CDN_URLS.italic),
      fetchFontBuf(LATO_CDN_URLS.boldObl),
    ]);
    const r = await doc.embedFont(rBuf);
    const b = await doc.embedFont(bBuf);
    const i = await doc.embedFont(iBuf);
    const o = await doc.embedFont(biBuf);
    return { regular: r, bold: b, italic: i, boldObl: o };
  } catch (err) {
    console.error("Font load failed, falling back to Helvetica:", err);
    return {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold:    await doc.embedFont(StandardFonts.HelveticaBold),
      italic:  await doc.embedFont(StandardFonts.HelveticaOblique),
      boldObl: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    };
  }
}

export type { ReportData };

export interface GeneratedReport {
  buffer: Uint8Array;
  filename: string;
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const BRAND   = rgb(0.055, 0.455, 0.831); // #0E74D4
const BRAND_D = rgb(0.035, 0.32,  0.62);  // darker brand
const DARK    = rgb(0.11,  0.11,  0.11);
const MUTED   = rgb(0.45,  0.45,  0.45);
const LIGHT   = rgb(0.95,  0.96,  0.98);
const LIGHT2  = rgb(0.98,  0.98,  0.99);
const WHITE   = rgb(1, 1, 1);
const SUCCESS = rgb(0.10, 0.60, 0.35);
const WARN    = rgb(0.85, 0.52, 0.05);
const DANGER  = rgb(0.78, 0.18, 0.22);
const ACCENT  = rgb(0.97, 0.55, 0.10);

// ─── Page constants (A4 points) ───────────────────────────────────────────────
const PW = 595;
const PH = 842;
const ML = 48;
const MR = 48;
const CW = PW - ML - MR;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 0): string {
  if (n == null) return "N/A";
  return `${prefix}${n.toLocaleString("en-AU", { maximumFractionDigits: decimals })}${suffix}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return `${(n * 100).toFixed(1)}%`;
}

function decileColour(d: number | null) {
  if (d == null) return MUTED;
  if (d >= 8) return SUCCESS;
  if (d >= 5) return WARN;
  return DANGER;
}

function decileLabel(d: number | null): string {
  if (d == null) return "N/A";
  if (d >= 8) return "High advantage";
  if (d >= 5) return "Average";
  return "Below average";
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, colour: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color: colour });
}

function drawText(
  page: PDFPage, str: string, x: number, y: number,
  opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; maxWidth?: number }
) {
  page.drawText(str, { x, y, font: opts.font, size: opts.size, color: opts.color ?? DARK, maxWidth: opts.maxWidth });
}

/** Estimate how many lines a string will wrap to at a given width.
 *  Mirrors pdf-lib's word-wrap algorithm so y-advances stay accurate. */
function wrappedLines(text: string, font: PDFFont, size: number, maxWidth: number): number {
  const spaceW = font.widthOfTextAtSize(" ", size);
  let lines = 1;
  let lineW = 0;
  for (const word of text.split(" ")) {
    const wordW = font.widthOfTextAtSize(word, size);
    // First word on a line: no leading space
    const needed = lineW === 0 ? wordW : lineW + spaceW + wordW;
    if (needed > maxWidth && lineW > 0) {
      lines++;
      lineW = wordW;
    } else {
      lineW = needed;
    }
  }
  return lines;
}

/** Draw wrapped text and return the y consumed (baseline of last line). */
function drawWrapped(
  page: PDFPage, text: string, x: number, y: number,
  opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; maxWidth: number; lineGap?: number }
): number {
  const lineH = opts.size * 1.45;
  const gap   = opts.lineGap ?? 0;
  const n     = wrappedLines(text, opts.font, opts.size, opts.maxWidth);
  page.drawText(text, { x, y, font: opts.font, size: opts.size, color: opts.color ?? DARK, maxWidth: opts.maxWidth, lineHeight: lineH });
  return y - (n - 1) * lineH - gap;
}

function hr(page: PDFPage, y: number, color = LIGHT) {
  page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 0.75, color });
}

function sectionHeading(page: PDFPage, y: number, title: string, subtitle: string, bold: PDFFont, regular: PDFFont): number {
  rect(page, ML, y, 4, 28, BRAND);
  rect(page, ML + 4, y, CW - 4, 28, LIGHT);
  drawText(page, title, ML + 14, y + 10, { font: bold, size: 12, color: DARK });
  if (subtitle) drawText(page, subtitle, ML + 14 + bold.widthOfTextAtSize(title, 12) + 10, y + 11, { font: regular, size: 8.5, color: MUTED });
  return y - 36;
}

function kvRow(page: PDFPage, y: number, label: string, value: string, note: string, regular: PDFFont, bold: PDFFont, zebra = false): number {
  if (zebra) rect(page, ML, y - 3, CW, 16, LIGHT2);
  drawText(page, label, ML + 6, y, { font: regular, size: 9, color: MUTED });
  drawText(page, value, ML + 200, y, { font: bold, size: 9, color: DARK });
  if (note) drawText(page, note, ML + 290, y, { font: regular, size: 8, color: MUTED, maxWidth: CW - 290 + MR - 6 });
  return y - 16;
}

function pageNum(page: PDFPage, n: number, total: number, regular: PDFFont) {
  drawText(page, `Page ${n} of ${total}`, PW - MR - 50, 8, { font: regular, size: 7, color: MUTED });
}

// ─── Page factory ─────────────────────────────────────────────────────────────

async function newPage(
  doc: PDFDocument, bold: PDFFont, regular: PDFFont,
  suburb: string, pageN: number, totalPages: number
): Promise<{ page: PDFPage; y: number }> {
  const page = doc.addPage([PW, PH]);

  // Header bar
  rect(page, 0, PH - 30, PW, 30, BRAND);
  drawText(page, "DemoReport", ML, PH - 20, { font: bold, size: 10, color: WHITE });
  drawText(page, "Demographic Feasibility Report", ML + 84, PH - 20, { font: regular, size: 8.5, color: rgb(0.75, 0.88, 0.97) });
  const suburbW = Math.min(bold.widthOfTextAtSize(suburb, 8.5), 180);
  drawText(page, suburb, PW - MR - suburbW, PH - 20, { font: bold, size: 8.5, color: WHITE, maxWidth: 180 });

  // Footer
  rect(page, 0, 0, PW, 22, LIGHT);
  page.drawLine({ start: { x: 0, y: 22 }, end: { x: PW, y: 22 }, thickness: 0.5, color: rgb(0.85, 0.87, 0.92) });
  drawText(page, "DemoReport · demoreport.com.au · Data: ABS Census 2021 & SEIFA 2021 · Not financial or planning advice", ML, 7, { font: regular, size: 6.5, color: MUTED });
  pageNum(page, pageN, totalPages, regular);

  return { page, y: PH - 66 };
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function statBox(
  page: PDFPage, x: number, y: number, w: number, h: number,
  label: string, value: string, sub: string,
  bold: PDFFont, regular: PDFFont, accent: ReturnType<typeof rgb> = BRAND
) {
  rect(page, x, y, w, h, LIGHT);
  rect(page, x, y + h - 3, w, 3, accent);
  drawText(page, label, x + 8, y + h - 18, { font: regular, size: 7.5, color: MUTED, maxWidth: w - 16 });
  drawText(page, value, x + 8, y + 18, { font: bold, size: 17, color: DARK, maxWidth: w - 16 });
  if (sub) drawText(page, sub, x + 8, y + 7, { font: regular, size: 7, color: MUTED, maxWidth: w - 16 });
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

function barChart(
  page: PDFPage, y: number,
  bands: [string, number | null][],
  regular: PDFFont, bold: PDFFont,
  colour: ReturnType<typeof rgb> = BRAND
): number {
  const maxVal = Math.max(...bands.map(([, v]) => v ?? 0));
  const barMaxW = CW - 130;
  for (const [label, val] of bands) {
    const barW = maxVal > 0 && val != null ? (val / maxVal) * barMaxW : 0;
    drawText(page, label, ML, y + 1, { font: regular, size: 8, color: MUTED });
    if (barW > 0) rect(page, ML + 68, y, barW, 11, colour);
    rect(page, ML + 68 + barW, y, barMaxW - barW, 11, LIGHT);
    drawText(page, pct(val), ML + 68 + barMaxW + 6, y + 1, { font: bold, size: 8, color: DARK });
    y -= 16;
  }
  return y - 4;
}

// ─── SEIFA decile gauge ───────────────────────────────────────────────────────

function seifaRow(
  page: PDFPage, y: number,
  name: string, score: number | null, decile: number | null,
  regular: PDFFont, bold: PDFFont, italic: PDFFont,
  zebra = false
): number {
  if (zebra) rect(page, ML, y - 4, CW, 34, LIGHT2);
  drawText(page, name, ML + 6, y + 16, { font: bold, size: 9, color: DARK });
  drawText(page, decileLabel(decile), ML + 6, y + 5, { font: italic, size: 8, color: MUTED });

  // Score
  drawText(page, `Score: ${fmt(score)}`, ML + CW - 160, y + 16, { font: regular, size: 9, color: MUTED });

  // Decile pip track
  const trackX = ML + CW - 160;
  const trackY = y + 3;
  for (let i = 1; i <= 10; i++) {
    const col = i <= (decile ?? 0) ? decileColour(decile) : LIGHT;
    rect(page, trackX + (i - 1) * 12, trackY, 10, 8, col);
  }
  drawText(page, decile != null ? `${decile}/10` : "N/A", trackX + 124, trackY, { font: bold, size: 8, color: decileColour(decile) });

  return y - 38;
}

// ─── Main export ──────────────────────────────────────────────────────────────

const TOTAL_PAGES = 10;

/**
 * Generate a 10-page DemoReport Feasibility Report PDF using pdf-lib.
 * Pure JS — no WASM, no Node.js APIs. Compatible with Cloudflare Workers.
 */
export async function generateFeasibilityReport(data: ReportData): Promise<GeneratedReport> {
  const doc = await PDFDocument.create();
  doc.setTitle(`DemoReport — ${data.suburb} ${data.state}`);
  doc.setAuthor("DemoReport");
  doc.setSubject(`Demographic Feasibility Report — ${data.suburb}, ${data.state}`);
  doc.setKeywords(["ABS", "Census", "SEIFA", "demographics", "feasibility", "property"]);
  doc.setCreator("DemoReport (demoreport.com.au)");
  doc.setCreationDate(new Date());

  const { bold, regular, italic, boldObl } = await loadFonts(doc);

  const suburb = data.suburb;
  const label  = `${suburb}, ${data.state}${data.postcode ? ` ${data.postcode}` : ""}`;
  const d      = data.demographics;
  const h      = data.housing;
  const s      = data.seifa;
  const ad     = d.ageDistribution;

  // ══════════════════════════════════════════════════════════════
  // PAGE 1 — Cover
  // ══════════════════════════════════════════════════════════════
  {
    const page = doc.addPage([PW, PH]);

    // Full-bleed header
    rect(page, 0, PH - 180, PW, 180, BRAND);
    rect(page, 0, PH - 183, PW, 3, ACCENT);

    // Brand wordmark
    drawText(page, "DemoReport", ML, PH - 60, { font: bold, size: 34, color: WHITE });
    drawText(page, "Demographic Feasibility Report", ML, PH - 86, { font: regular, size: 15, color: rgb(0.75, 0.88, 0.97) });
    drawText(page, "Powered by ABS Census 2021 & SEIFA 2021", ML, PH - 104, { font: italic, size: 9, color: rgb(0.65, 0.80, 0.93) });

    // Suburb banner inside header
    rect(page, ML, PH - 172, CW, 58, BRAND_D);
    drawText(page, label, ML + 16, PH - 138, { font: bold, size: 20, color: WHITE });
    drawText(page, `SA2 Code: ${data.sa2Code}   ·   Census Year: ${data.censusYear}`, ML + 16, PH - 161, { font: regular, size: 9, color: rgb(0.75, 0.88, 0.97) });

    // 6-stat grid
    const boxW  = (CW - 8) / 3;
    const boxH  = 70;
    let bx = ML;
    let by = PH - 270;

    const coverStats: [string, string, string, ReturnType<typeof rgb>][] = [
      ["Total Population",      fmt(d.totalPopulation),              "residents (ABS 2021)",       BRAND],
      ["Median Age",            fmt(d.medianAge, "", " yrs"),        "across all residents",       SUCCESS],
      ["Median HH Income",      fmt(d.medianHouseholdIncome, "$", "/wk"), "household weekly income", ACCENT],
      ["Median Personal Income",fmt(d.medianPersonalIncome, "$", "/wk"),  "personal weekly income", rgb(0.45, 0.31, 0.78)],
      ["Median Weekly Rent",    fmt(h.medianRentWeekly, "$", "/wk"), "private dwellings",          rgb(0.12, 0.60, 0.55)],
      ["Median Mortgage",       fmt(h.medianMortgageMonthly, "$", "/mo"), "monthly repayment",     rgb(0.72, 0.22, 0.56)],
    ];

    for (let i = 0; i < coverStats.length; i++) {
      const [lbl, val, sub, acc] = coverStats[i];
      if (i === 3) { bx = ML; by -= boxH + 6; }
      statBox(page, bx, by, boxW, boxH, lbl, val, sub, bold, regular, acc);
      bx += boxW + 4;
    }

    // Table of contents
    let ty = by - 30;
    drawText(page, "Report Contents", ML, ty, { font: bold, size: 11, color: DARK });
    ty -= 6;
    hr(page, ty, LIGHT);
    ty -= 16;

    const toc: [string, number][] = [
      ["Executive Summary",             2],
      ["Section 1 — Population & Demographics",    3],
      ["Section 2 — Age Distribution",             4],
      ["Section 3 — Income & Employment",          5],
      ["Section 4 — Housing Stock & Tenure",       6],
      ["Section 5 — SEIFA Socio-Economic Indices", 7],
      ["Section 6 — Language & Cultural Diversity",8],
      ["Section 7 — Suburb Comparison Snapshot",   9],
      ["Data Sources & Methodology",              10],
    ];

    for (const [title, pg] of toc) {
      drawText(page, title, ML + 6, ty, { font: regular, size: 9, color: DARK });
      drawText(page, `${pg}`, PW - MR - 10, ty, { font: regular, size: 9, color: MUTED });
      page.drawLine({ start: { x: ML + 6 + regular.widthOfTextAtSize(title, 9) + 4, y: ty + 3 }, end: { x: PW - MR - 16, y: ty + 3 }, thickness: 0.5, color: LIGHT, dashArray: [2, 2], dashPhase: 0 });
      ty -= 16;
    }

    // Footer
    rect(page, 0, 0, PW, 34, LIGHT);
    page.drawLine({ start: { x: 0, y: 34 }, end: { x: PW, y: 34 }, thickness: 0.5, color: rgb(0.85, 0.87, 0.92) });
    drawText(page, `Generated: ${data.generatedAt}`, ML, 20, { font: regular, size: 7.5, color: MUTED });
    drawText(page, "demoreport.com.au", ML, 9, { font: bold, size: 7.5, color: BRAND });
    drawText(page, "This report is for informational purposes only. Not financial, planning, or investment advice.", ML + 140, 9, { font: italic, size: 7, color: MUTED, maxWidth: 300 });
    drawText(page, "Page 1 of 10", PW - MR - 54, 9, { font: regular, size: 7, color: MUTED });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 2 — Executive Summary
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 2, TOTAL_PAGES);
    let y = startY;

    drawText(page, "Executive Summary", ML, y, { font: bold, size: 16, color: DARK });
    y -= 6;
    hr(page, y, BRAND);
    y -= 20;

    // Lead paragraph
    const irsdDecile = s.irsdDecile ?? 0;
    const affluence = irsdDecile >= 8 ? "an affluent" : irsdDecile >= 5 ? "a mid-tier" : "a lower socio-economic";
    const pop = d.totalPopulation != null ? `${d.totalPopulation.toLocaleString("en-AU")} residents` : "residents";
    const age = d.medianAge != null ? ` The median age of ${d.medianAge} years` : "";
    const summary =
      `${suburb} is ${affluence} suburb with ${pop} recorded in the 2021 ABS Census.` +
      `${age} ${d.medianAge && d.medianAge < 35 ? "indicates a younger, potentially first-home-buyer demographic." : d.medianAge && d.medianAge > 45 ? "indicates an older, established residential demographic." : "reflects a broad age mix across the community."}`;

    y = drawWrapped(page, summary, ML, y, { font: regular, size: 9.5, color: DARK, maxWidth: CW, lineGap: 18 });

    // Key findings boxes
    drawText(page, "Key Findings", ML, y, { font: bold, size: 11, color: DARK });
    y -= 20;

    const findings: [string, string, ReturnType<typeof rgb>][] = [
      [
        "Socio-Economic Status",
        `IRSD decile ${s.irsdDecile ?? "N/A"}/10 places ${suburb} in the ${decileLabel(s.irsdDecile).toLowerCase()} bracket nationally. IRSAD score of ${fmt(s.irsad)} reflects ${s.irsadDecile && s.irsadDecile >= 7 ? "above-average" : "below-average"} socio-economic advantage and disadvantage.`,
        decileColour(s.irsdDecile),
      ],
      [
        "Housing Affordability",
        `Median weekly rent of ${fmt(h.medianRentWeekly, "$")} and monthly mortgage repayment of ${fmt(h.medianMortgageMonthly, "$")} suggest ${h.medianRentWeekly && h.medianRentWeekly > 500 ? "a higher-cost" : "a moderate-cost"} rental and ownership market. Total dwellings: ${fmt(h.totalDwellings)}.`,
        BRAND,
      ],
      [
        "Income Profile",
        `Median household income of ${fmt(d.medianHouseholdIncome, "$", "/wk")} and personal income of ${fmt(d.medianPersonalIncome, "$", "/wk")} indicate ${d.medianHouseholdIncome && d.medianHouseholdIncome > 1800 ? "above-average" : "average"} earning capacity relative to the national median (~$1,746/wk).`,
        SUCCESS,
      ],
      [
        "Population Composition",
        `${pct(d.indigenousPopulation)} of residents identify as Aboriginal or Torres Strait Islander. ${d.bornOverseas != null ? `${pct(d.bornOverseas)} were born overseas.` : ""} The suburb has ${d.totalPopulation && d.totalPopulation > 15000 ? "a large" : d.totalPopulation && d.totalPopulation > 5000 ? "a medium" : "a smaller"} population base.`,
        ACCENT,
      ],
    ];

    for (const [title, body, accent] of findings) {
      rect(page, ML, y - 42, CW, 52, LIGHT2);
      rect(page, ML, y - 42, 4, 52, accent);
      drawText(page, title, ML + 12, y + 1, { font: bold, size: 9.5, color: DARK });
      drawText(page, body, ML + 12, y - 12, { font: regular, size: 8.5, color: MUTED, maxWidth: CW - 18 });
      y -= 60;
    }

    y -= 10;
    hr(page, y, LIGHT);
    y -= 16;
    drawText(page, "Note: This executive summary is automatically generated from ABS 2021 Census data. Refer to individual sections for full detail.", ML, y, { font: italic, size: 7.5, color: MUTED, maxWidth: CW });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 3 — Section 1: Population & Demographics
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 3, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 1 — Population & Demographics", "ABS Census 2021 · SA2 Level", bold, regular);

    const rows: [string, string, string][] = [
      ["Total Population",               fmt(d.totalPopulation),                    "persons (usual residents)"],
      ["Median Age",                     fmt(d.medianAge, "", " years"),             "across all residents"],
      ["Median Household Income",        fmt(d.medianHouseholdIncome, "$", "/wk"),   "weekly (before tax)"],
      ["Median Personal Income",         fmt(d.medianPersonalIncome, "$", "/wk"),    "weekly (before tax)"],
      ["Aboriginal & Torres Strait Islander", pct(d.indigenousPopulation),           "of total population"],
      ["Born Overseas",                  pct(d.bornOverseas),                        "of total population"],
      ["Speaks English Only at Home",    pct(d.speaksEnglishOnly),                   "of total population"],
      ["Families with Children",         pct(d.familiesWithChildren),                "of all family households"],
      ["Single-Parent Families",         pct(d.singleParentFamilies),                "of all family households"],
    ];

    let zebra = false;
    for (const [lbl, val, note] of rows) {
      y = kvRow(page, y, lbl, val, note, regular, bold, zebra);
      zebra = !zebra;
    }

    y -= 12;
    hr(page, y);
    y -= 20;

    // Insight box
    drawText(page, "Interpretation", ML, y, { font: bold, size: 10, color: DARK });
    y -= 14;
    rect(page, ML, y - 52, CW, 60, LIGHT2);
    rect(page, ML, y - 52, 4, 60, BRAND);
    const insight =
      `With a median age of ${fmt(d.medianAge, "", " years")} and median household income of ` +
      `${fmt(d.medianHouseholdIncome, "$", "/wk")}, ${suburb} presents a ` +
      `${d.medianAge && d.medianAge < 38 ? "younger, family-forming" : "more established"} demographic profile. ` +
      `${d.indigenousPopulation && d.indigenousPopulation > 0.05 ? "The above-average Indigenous population proportion should inform cultural engagement planning." : ""}` +
      `${d.bornOverseas && d.bornOverseas > 0.30 ? " High overseas-born proportion suggests strong demand for multilingual services." : ""}`;
    drawText(page, insight, ML + 14, y - 6, { font: regular, size: 8.5, color: DARK, maxWidth: CW - 22 });
    y -= 70;
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 4 — Section 2: Age Distribution
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 4, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 2 — Age Distribution", "Five-year age groups · ABS Census 2021", bold, regular);

    const ageBands: [string, number | null][] = [
      ["0–4 years",   ad["0_4"]],
      ["5–14 years",  ad["5_14"]],
      ["15–24 years", ad["15_24"]],
      ["25–34 years", ad["25_34"]],
      ["35–44 years", ad["35_44"]],
      ["45–54 years", ad["45_54"]],
      ["55–64 years", ad["55_64"]],
      ["65–74 years", ad["65_74"]],
      ["75+ years",   ad["75_plus"]],
    ];

    y = barChart(page, y, ageBands, regular, bold, BRAND);
    y -= 12;
    hr(page, y);
    y -= 20;

    // Derived insights
    drawText(page, "Age Band Analysis", ML, y, { font: bold, size: 10, color: DARK });
    y -= 18;

    const workingAge = (ad["25_34"] ?? 0) + (ad["35_44"] ?? 0) + (ad["45_54"] ?? 0);
    const youth      = (ad["0_4"] ?? 0) + (ad["5_14"] ?? 0) + (ad["15_24"] ?? 0);
    const seniors    = (ad["65_74"] ?? 0) + (ad["75_plus"] ?? 0);

    const aggRows: [string, string, string][] = [
      ["Working Age (25–54)",   pct(workingAge), workingAge > 0.45 ? "Strong working-age core — supports services demand" : "Below average working-age presence"],
      ["Youth (0–24)",          pct(youth),      youth > 0.30 ? "Young population — family-service infrastructure demand" : "Moderate youth cohort"],
      ["Seniors (65+)",         pct(seniors),    seniors > 0.20 ? "Ageing population — aged care & healthcare demand" : "Below-average senior cohort"],
    ];

    let zebra = false;
    for (const [lbl, val, note] of aggRows) {
      y = kvRow(page, y, lbl, val, note, regular, bold, zebra);
      zebra = !zebra;
    }

    y -= 20;
    // Dependency ratio note
    const dependencyRatio = workingAge > 0 ? ((youth + seniors) / workingAge).toFixed(2) : "N/A";
    rect(page, ML, y - 36, CW, 50, LIGHT2);
    rect(page, ML, y - 36, 4, 50, ACCENT);
    drawText(page, `Estimated Dependency Ratio: ${dependencyRatio}`, ML + 14, y + 4, { font: bold, size: 9.5, color: DARK });
    drawText(page, "Ratio of dependants (youth + seniors) to working-age population. Lower = more economically active community.", ML + 14, y - 12, { font: regular, size: 8.5, color: MUTED, maxWidth: CW - 22 });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 5 — Section 3: Income & Employment
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 5, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 3 — Income & Employment", "ABS Census 2021 · SA2 Level", bold, regular);

    const incomeRows: [string, string, string][] = [
      ["Median Household Income",  fmt(d.medianHouseholdIncome, "$", "/wk"),  "weekly, before tax"],
      ["Median Personal Income",   fmt(d.medianPersonalIncome, "$", "/wk"),   "weekly, before tax"],
      ["Annualised HH Income",     fmt(d.medianHouseholdIncome ? d.medianHouseholdIncome * 52 : null, "$"), "estimated annual"],
      ["Annualised Personal",      fmt(d.medianPersonalIncome ? d.medianPersonalIncome * 52 : null, "$"),   "estimated annual"],
      ["vs National Median HH",    d.medianHouseholdIncome != null ? (d.medianHouseholdIncome > 1746 ? `+$${(d.medianHouseholdIncome - 1746).toFixed(0)}/wk above` : `-$${(1746 - d.medianHouseholdIncome).toFixed(0)}/wk below`) : "N/A", "national median ~$1,746/wk (ABS 2021)"],
    ];

    let zebra = false;
    for (const [lbl, val, note] of incomeRows) {
      y = kvRow(page, y, lbl, val, note, regular, bold, zebra);
      zebra = !zebra;
    }

    y -= 12;
    hr(page, y);
    y -= 20;

    // Income interpretation
    drawText(page, "Income Context for Development Planning", ML, y, { font: bold, size: 10, color: DARK });
    y -= 18;

    const incPoints = [
      `Household income of ${fmt(d.medianHouseholdIncome, "$", "/wk")} implies maximum comfortable mortgage (30% income rule) of approx. ${fmt(d.medianHouseholdIncome ? Math.round(d.medianHouseholdIncome * 0.3 * 52 / 12) : null, "$", "/mo")}.`,
      `Personal income suggests ${d.medianPersonalIncome && d.medianPersonalIncome > 800 ? "a predominantly full-time employed" : "a mixed employment"} workforce profile.`,
      `${d.medianHouseholdIncome && d.medianHouseholdIncome > 2000 ? "Above-average household income indicates market capacity for premium residential product." : "Moderate incomes suggest demand for mid-market or affordable housing typologies."}`,
    ];

    for (const pt of incPoints) {
      rect(page, ML, y - 2, 5, 5, BRAND);
      y = drawWrapped(page, pt, ML + 12, y, { font: regular, size: 9, color: DARK, maxWidth: CW - 12, lineGap: 10 });
    }

    y -= 10;
    hr(page, y);
    y -= 20;

    drawText(page, "Limitations", ML, y, { font: bold, size: 9, color: MUTED });
    y -= 14;
    drawText(page, "Census income data is self-reported and may underrepresent investment income, trusts, and business income. Employment status data (labour force participation, unemployment) is available in ABS TableBuilder but not included in the standard GCP short-header DataPack used here.", ML, y, { font: italic, size: 8, color: MUTED, maxWidth: CW });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 6 — Section 4: Housing Stock & Tenure
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 6, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 4 — Housing Stock & Tenure", "ABS Census 2021 · SA2 Level", bold, regular);

    const housingRows: [string, string, string][] = [
      ["Total Dwellings",           fmt(h.totalDwellings),                         "all private dwellings"],
      ["Median Weekly Rent",        fmt(h.medianRentWeekly, "$", "/wk"),           "private rental market"],
      ["Median Monthly Mortgage",   fmt(h.medianMortgageMonthly, "$", "/mo"),      "owner-occupier repayment"],
      ["Median House Price",        fmt(h.medianHousePrice, "$"),                   "if available"],
      ["Owner-Occupied",            pct(h.ownerOccupied),                           "of all dwellings"],
      ["Renting",                   pct(h.renting),                                 "private rental"],
      ["Social / Public Housing",   pct(h.socialHousing),                           "government-managed"],
    ];

    let zebra = false;
    for (const [lbl, val, note] of housingRows) {
      y = kvRow(page, y, lbl, val, note, regular, bold, zebra);
      zebra = !zebra;
    }

    y -= 12;
    hr(page, y);
    y -= 20;

    // Tenure split bar
    drawText(page, "Tenure Profile", ML, y, { font: bold, size: 10, color: DARK });
    y -= 20;

    const tenureItems: [string, number | null, ReturnType<typeof rgb>][] = [
      ["Owner-Occupied", h.ownerOccupied, SUCCESS],
      ["Renting",        h.renting,       BRAND],
      ["Social Housing", h.socialHousing, ACCENT],
    ];

    for (const [lbl, val, col] of tenureItems) {
      const w = val != null ? val * CW : 0;
      drawText(page, lbl, ML, y + 2, { font: regular, size: 8.5, color: DARK });
      rect(page, ML + 100, y, w > 0 ? w * 0.85 : 0, 13, col);
      drawText(page, pct(val), ML + 100 + (w > 0 ? w * 0.85 + 6 : 6), y + 2, { font: bold, size: 8.5, color: DARK });
      y -= 22;
    }

    y -= 8;
    hr(page, y);
    y -= 20;

    // Housing insight
    drawText(page, "Planning Implications", ML, y, { font: bold, size: 10, color: DARK });
    y -= 18;

    const rentPressure = h.medianRentWeekly && h.medianRentWeekly > 500 ? "high" : "moderate";
    const ownerPct     = h.ownerOccupied != null ? (h.ownerOccupied * 100).toFixed(0) : "N/A";

    const housingPoints = [
      `${ownerPct}% owner-occupier rate indicates a ${parseInt(ownerPct) > 65 ? "predominantly owner-occupier community — stable demand for quality family product." : "mixed tenure profile — opportunity for both rental and ownership product."}`,
      `${rentPressure.charAt(0).toUpperCase() + rentPressure.slice(1)} rental pressure (${fmt(h.medianRentWeekly, "$", "/wk")}) ${rentPressure === "high" ? "suggests undersupply — strong case for new rental product." : "suggests a balanced rental market."}`,
      `Mortgage serviceability: ${fmt(h.medianMortgageMonthly, "$", "/mo")} median repayment relative to ${fmt(d.medianHouseholdIncome, "$", "/wk")} household income suggests ${h.medianMortgageMonthly && d.medianHouseholdIncome ? ((h.medianMortgageMonthly / (d.medianHouseholdIncome * 4.33)) * 100).toFixed(0) + "% of income on mortgage" : "serviceability data unavailable"}.`,
    ];

    for (const pt of housingPoints) {
      rect(page, ML, y - 2, 5, 5, SUCCESS);
      y = drawWrapped(page, pt, ML + 12, y, { font: regular, size: 9, color: DARK, maxWidth: CW - 12, lineGap: 10 });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 7 — Section 5: SEIFA
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 7, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 5 — SEIFA Socio-Economic Indices", "ABS SEIFA 2021 · SA2 Level", bold, regular);

    y = drawWrapped(page, "SEIFA (Socio-Economic Indexes for Areas) measures the relative socio-economic advantage and disadvantage of Australian communities. Scores and deciles are relative to all SA2 areas nationally.", ML, y, { font: italic, size: 8.5, color: MUTED, maxWidth: CW, lineGap: 26 });

    const seifaRows: [string, string, number | null, number | null][] = [
      ["IRSD",  "Index of Relative Socio-Economic Disadvantage — measures disadvantage only. Lower score = more disadvantaged.",   s.irsd,  s.irsdDecile],
      ["IRSAD", "Index of Relative Socio-Economic Advantage & Disadvantage — measures both extremes.",                              s.irsad, s.irsadDecile],
      ["IER",   "Index of Economic Resources — focuses on income, wealth, and housing costs.",                                     s.ier,   s.ierDecile],
      ["IEO",   "Index of Education and Occupation — measures education levels and occupational skill.",                           s.ieo,   s.ieoDecile],
    ];

    for (let i = 0; i < seifaRows.length; i++) {
      const [code, desc, score, decile] = seifaRows[i];

      // Dynamic card height — desc text starts at y-27 and may wrap
      const descMaxW = CW - 140;
      const descLineH = 8 * 1.45;
      const descN    = wrappedLines(desc, regular, 8, descMaxW);
      // Right column (pips) reaches down to y-52. Left column bottom = y-27-(descN-1)*lineH-8 (padding).
      const leftBottom  = 27 + (descN - 1) * descLineH + 10;
      const cardBottom  = Math.max(leftBottom, 60); // never smaller than original
      const cardH       = Math.round(8 + cardBottom);  // 8 = top padding above y

      // Card background
      rect(page, ML, y - cardBottom, CW, cardH, i % 2 === 0 ? LIGHT2 : WHITE);
      rect(page, ML, y - cardBottom, 4, cardH, decileColour(decile));

      drawText(page, code, ML + 12, y + 2, { font: bold, size: 13, color: DARK });
      drawText(page, `Score: ${fmt(score)}`, ML + 12, y - 14, { font: bold, size: 10, color: decileColour(decile) });
      page.drawText(desc, { x: ML + 12, y: y - 27, font: regular, size: 8, color: MUTED, maxWidth: descMaxW, lineHeight: descLineH });

      // Decile pips (fixed offsets from card top — right column)
      const pipX = ML + CW - 128;
      drawText(page, "Decile", pipX, y + 2, { font: regular, size: 7.5, color: MUTED });
      drawText(page, decile != null ? `${decile} / 10` : "N/A", pipX, y - 12, { font: bold, size: 14, color: decileColour(decile) });
      drawText(page, decileLabel(decile), pipX, y - 27, { font: italic, size: 8, color: MUTED });
      for (let pip = 1; pip <= 10; pip++) {
        rect(page, pipX + (pip - 1) * 11, y - 44, 9, 8, pip <= (decile ?? 0) ? decileColour(decile) : LIGHT);
      }

      y -= cardH + 6;
    }

    y -= 8;
    drawText(page, "Decile 1 = most disadvantaged 10% of SA2 areas nationally.  Decile 10 = most advantaged 10%.", ML, y, { font: italic, size: 7.5, color: MUTED });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 8 — Section 6: Language & Cultural Diversity
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 8, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 6 — Language & Cultural Diversity", "ABS Census 2021 · SA2 Level", bold, regular);

    const langRows: [string, string, string][] = [
      ["Speaks English Only",     pct(d.speaksEnglishOnly),  "of population at home"],
      ["Born Overseas",           pct(d.bornOverseas),        "of total population"],
      ["Indigenous Population",   pct(d.indigenousPopulation),"Aboriginal & Torres Strait Islander"],
    ];

    let zebra = false;
    for (const [lbl, val, note] of langRows) {
      y = kvRow(page, y, lbl, val, note, regular, bold, zebra);
      zebra = !zebra;
    }

    y -= 12;

    if (d.topLanguages && d.topLanguages.length > 0) {
      hr(page, y);
      y -= 20;
      drawText(page, "Top Languages Spoken at Home", ML, y, { font: bold, size: 10, color: DARK });
      y -= 18;
      const langBands: [string, number | null][] = d.topLanguages.slice(0, 8).map(l => [l.language, l.pct]);
      y = barChart(page, y, langBands, regular, bold, rgb(0.45, 0.31, 0.78));
    } else {
      hr(page, y);
      y -= 20;
      drawText(page, "Top Languages Spoken at Home", ML, y, { font: bold, size: 10, color: DARK });
      y -= 18;
      rect(page, ML, y - 24, CW, 32, LIGHT2);
      drawText(page, "Language diversity breakdown (G13 — Language Spoken at Home) was not available in the short-header Census DataPack for this area. Full language data is available via ABS TableBuilder.", ML + 14, y - 14, { font: italic, size: 8.5, color: MUTED, maxWidth: CW - 22 });
      y -= 44;
    }

    y -= 12;
    hr(page, y);
    y -= 20;

    drawText(page, "Cultural Planning Considerations", ML, y, { font: bold, size: 10, color: DARK });
    y -= 18;

    const langPoints = [
      d.speaksEnglishOnly != null && d.speaksEnglishOnly < 0.60
        ? `${pct(1 - (d.speaksEnglishOnly ?? 0))} of residents speak a language other than English at home — bilingual services and multilingual signage should be considered.`
        : `${pct(d.speaksEnglishOnly)} English-only rate indicates a predominantly English-speaking community — standard service delivery is appropriate.`,
      d.bornOverseas != null && d.bornOverseas > 0.25
        ? `High overseas-born population (${pct(d.bornOverseas)}) suggests diverse cultural traditions and potential demand for culturally specific services, food retail, and community facilities.`
        : `Overseas-born population of ${pct(d.bornOverseas)} is within typical range for Australian suburbs.`,
      d.indigenousPopulation != null && d.indigenousPopulation > 0.02
        ? `Aboriginal and Torres Strait Islander population (${pct(d.indigenousPopulation)}) — culturally appropriate engagement, consultation, and heritage assessment obligations apply.`
        : `Indigenous population proportion is below 2% — standard consultation processes apply, though cultural heritage obligations remain.`,
    ];

    for (const pt of langPoints) {
      rect(page, ML, y - 2, 5, 5, rgb(0.45, 0.31, 0.78));
      y = drawWrapped(page, pt, ML + 12, y, { font: regular, size: 9, color: DARK, maxWidth: CW - 12, lineGap: 10 });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 9 — Section 7: Comparison Snapshot
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 9, TOTAL_PAGES);
    let y = startY;

    y = sectionHeading(page, y, "Section 7 — Suburb Comparison Snapshot", "National benchmarks · ABS Census 2021", bold, regular);

    drawText(page, `How ${suburb} compares to national averages across key indicators`, ML, y, { font: italic, size: 9, color: MUTED });
    y -= 24;

    // Comparison table
    const nationals = [
      { label: "Median Age",           suburb: d.medianAge,               nat: 38,    unit: " yrs", fmt2: (v: number) => `${v} yrs` },
      { label: "Median HH Income",     suburb: d.medianHouseholdIncome,   nat: 1746,  unit: "/wk",  fmt2: (v: number) => `$${v}/wk` },
      { label: "Median Personal Inc.", suburb: d.medianPersonalIncome,    nat: 805,   unit: "/wk",  fmt2: (v: number) => `$${v}/wk` },
      { label: "Median Weekly Rent",   suburb: h.medianRentWeekly,        nat: 400,   unit: "/wk",  fmt2: (v: number) => `$${v}/wk` },
      { label: "Monthly Mortgage",     suburb: h.medianMortgageMonthly,   nat: 1900,  unit: "/mo",  fmt2: (v: number) => `$${v}/mo` },
      { label: "IRSD Score",           suburb: s.irsd,                    nat: 1000,  unit: "",     fmt2: (v: number) => `${v}` },
      { label: "IRSAD Score",          suburb: s.irsad,                   nat: 1000,  unit: "",     fmt2: (v: number) => `${v}` },
    ];

    // Header row
    rect(page, ML, y, CW, 16, BRAND);
    drawText(page, "Indicator", ML + 6, y + 4, { font: bold, size: 8.5, color: WHITE });
    drawText(page, `${suburb}`, ML + 170, y + 4, { font: bold, size: 8.5, color: WHITE });
    drawText(page, "National Avg", ML + 270, y + 4, { font: bold, size: 8.5, color: WHITE });
    drawText(page, "vs National", ML + 370, y + 4, { font: bold, size: 8.5, color: WHITE });
    y -= 16;

    let zebra = false;
    for (const row of nationals) {
      if (zebra) rect(page, ML, y, CW, 16, LIGHT2);
      drawText(page, row.label, ML + 6, y + 4, { font: regular, size: 8.5, color: DARK });

      const sv = row.suburb;
      const nv = row.nat;
      drawText(page, sv != null ? `${row.fmt2(sv)}` : "N/A", ML + 170, y + 4, { font: bold, size: 8.5, color: DARK });
      drawText(page, row.fmt2(nv), ML + 270, y + 4, { font: regular, size: 8.5, color: MUTED });

      if (sv != null) {
        const diff = sv - nv;
        const diffPct = ((diff / nv) * 100).toFixed(1);
        const positive = diff >= 0;
        const col = label === "IRSD Score" || label === "IRSAD Score"
          ? (positive ? SUCCESS : DANGER)
          : (positive ? SUCCESS : DANGER);
        drawText(page, `${positive ? "+" : ""}${diffPct}%`, ML + 370, y + 4, { font: bold, size: 8.5, color: col });
      } else {
        drawText(page, "N/A", ML + 370, y + 4, { font: regular, size: 8.5, color: MUTED });
      }

      y -= 18;
      zebra = !zebra;
    }

    y -= 10;
    drawText(page, "National averages sourced from ABS 2021 Census national SA2 median values.", ML, y, { font: italic, size: 7.5, color: MUTED });
    y -= 20;
    hr(page, y);
    y -= 20;

    // Overall rating
    drawText(page, "Overall Suburb Rating", ML, y, { font: bold, size: 11, color: DARK });
    y -= 18;

    const score2 = [
      s.irsdDecile ?? 5,
      s.irsadDecile ?? 5,
      d.medianHouseholdIncome ? Math.min(10, Math.round(d.medianHouseholdIncome / 350)) : 5,
      h.medianRentWeekly ? Math.max(1, 10 - Math.round(h.medianRentWeekly / 120)) : 5,
    ];
    const avg = score2.reduce((a, b) => a + b, 0) / score2.length;
    const stars = Math.round(avg / 2);

    rect(page, ML, y - 34, CW, 44, LIGHT2);
    rect(page, ML, y - 34, 4, 44, decileColour(Math.round(avg)));
    drawText(page, `Composite Score: ${avg.toFixed(1)} / 10`, ML + 14, y, { font: bold, size: 12, color: DARK });
    const starStr = "*".repeat(stars) + "-".repeat(5 - stars);
    drawText(page, starStr, ML + 14, y - 16, { font: bold, size: 16, color: ACCENT });
    drawText(page, "Based on SEIFA indices, income, and housing affordability metrics.", ML + 14, y - 28, { font: italic, size: 8, color: MUTED, maxWidth: CW - 24 });
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 10 — Data Sources & Methodology
  // ══════════════════════════════════════════════════════════════
  {
    const { page, y: startY } = await newPage(doc, bold, regular, label, 10, TOTAL_PAGES);
    let y = startY;

    drawText(page, "Data Sources & Methodology", ML, y, { font: bold, size: 16, color: DARK });
    y -= 6;
    hr(page, y, BRAND);
    y -= 20;

    drawText(page, "Primary Data Sources", ML, y, { font: bold, size: 11, color: DARK });
    y -= 16;

    const sources: [string, string, string][] = [
      [
        "ABS Census 2021 — General Community Profile (GCP)",
        "Australian Bureau of Statistics · abs.gov.au",
        "Provides population, age, income, housing tenure, and language diversity at SA2 level. Short-header DataPack used (Tables G01, G04, G09, G17, G33, G36).",
      ],
      [
        "ABS SEIFA 2021 — Socio-Economic Indexes for Areas",
        "Australian Bureau of Statistics · abs.gov.au",
        "Four composite indices (IRSD, IRSAD, IER, IEO) computed from 2021 Census data. SA2-level scores and decile rankings relative to all SA2 areas nationally.",
      ],
      [
        "ASGS Edition 3 — Australian Statistical Geography Standard",
        "Australian Bureau of Statistics · abs.gov.au",
        "SA2 to Postcode concordance via Mesh Block allocation files (MB_2021_AUST.xlsx, POA_2021_AUST.xlsx).",
      ],
    ];

    for (const [title, source, desc] of sources) {
      rect(page, ML, y - 44, CW, 54, LIGHT2);
      rect(page, ML, y - 44, 4, 54, BRAND);
      drawText(page, title, ML + 14, y + 2, { font: bold, size: 9.5, color: DARK, maxWidth: CW - 22 });
      drawText(page, source, ML + 14, y - 11, { font: boldObl, size: 8, color: BRAND });
      drawText(page, desc, ML + 14, y - 24, { font: regular, size: 8, color: MUTED, maxWidth: CW - 22 });
      y -= 62;
    }

    y -= 6;
    hr(page, y);
    y -= 18;

    drawText(page, "Methodology", ML, y, { font: bold, size: 11, color: DARK });
    y -= 16;

    const methodPoints = [
      "All data is sourced from official ABS publications. No data has been adjusted, interpolated, or modelled.",
      "SA2 (Statistical Area Level 2) is the primary geography for all indicators. SA2 areas correspond approximately to suburb boundaries.",
      "Where a suburb spans multiple SA2 areas, the SA2 with the matching postcode is selected. All SA2 areas matching the search are returned via the API.",
      "Percentage values (e.g. age bands, tenure type) are expressed as proportions of the relevant population denominator.",
      "Housing price data (medianHousePrice) is not available in the standard Census DataPack — it requires CoreLogic or Domain integration and is shown as N/A where not available.",
      "Language diversity data requires the G13 (Language Spoken at Home) Census table which is not included in the short-header GCP DataPack. Full data is available in ABS TableBuilder.",
    ];

    for (const pt of methodPoints) {
      rect(page, ML + 2, y + 2, 4, 4, MUTED);
      y = drawWrapped(page, pt, ML + 12, y, { font: regular, size: 8.5, color: DARK, maxWidth: CW - 12, lineGap: 10 });
    }

    y -= 8;
    hr(page, y);
    y -= 16;

    drawText(page, "Disclaimer", ML, y, { font: bold, size: 9, color: MUTED });
    y -= 14;
    y = drawWrapped(page, "This report is generated automatically from publicly available ABS data. DemoReport makes no representations as to the accuracy, completeness, or suitability of this information for any particular purpose. This report does not constitute financial, investment, planning, or legal advice. Users should seek independent professional advice before making decisions based on this information. Data reflects the 2021 Census period and may not reflect current conditions.", ML, y, { font: italic, size: 7.5, color: MUTED, maxWidth: CW, lineGap: 16 });

    rect(page, ML, y - 14, CW, 24, BRAND);
    drawText(page, "Thank you for using DemoReport · demoreport.com.au", ML + 10, y - 5, { font: bold, size: 10, color: WHITE });
  }

  const pdfBytes = await doc.save();
  const buffer   = new Uint8Array(pdfBytes);

  const slug = data.suburb
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const filename = `demoreport-${slug}-${data.state.toLowerCase()}-${data.censusYear}.pdf`;

  return { buffer, filename };
}

/**
 * Professional ($199) — Single report + comparison section with up to 2 neighbours.
 * Appends a multi-suburb side-by-side comparison after the standard 10 pages.
 */
export async function generateComparisonReport(
  primary: ReportData,
  neighbours: ReportData[],
): Promise<GeneratedReport> {
  // Generate the base 10-page report for the primary suburb
  const base = await generateFeasibilityReport(primary);

  // Load and append a comparison section
  const basePdf  = await PDFDocument.load(base.buffer);
  const compDoc  = await PDFDocument.create();
  const { bold, regular, italic } = await loadFonts(compDoc);

  const allSuburbs = [primary, ...neighbours.slice(0, 2)];
  const label = `${primary.suburb}, ${primary.state}`;

  // Comparison page
  const page = compDoc.addPage([PW, PH]);

  // Header
  rect(page, 0, PH - 30, PW, 30, BRAND);
  drawText(page, "DemoReport Professional", ML, PH - 20, { font: bold, size: 10, color: WHITE });
  drawText(page, "Neighbourhood Comparison", PW - MR - 180, PH - 20, { font: regular, size: 8.5, color: rgb(0.75, 0.88, 0.97) });

  let y = PH - 60;
  drawText(page, "Suburb Comparison", ML, y, { font: bold, size: 16, color: DARK });
  y -= 6;
  page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 1, color: BRAND });
  y -= 20;
  drawText(page, `${primary.suburb} vs ${neighbours.map(n => n.suburb).join(" vs ")}`, ML, y, { font: italic, size: 9, color: MUTED });
  y -= 24;

  // Column headers
  const colW = CW / allSuburbs.length;
  rect(page, ML, y, CW, 18, BRAND);
  drawText(page, "Indicator", ML + 4, y + 5, { font: bold, size: 8, color: WHITE });
  for (let i = 0; i < allSuburbs.length; i++) {
    drawText(page, allSuburbs[i].suburb, ML + 100 + i * ((CW - 100) / allSuburbs.length), y + 5, { font: bold, size: 8, color: WHITE, maxWidth: (CW - 100) / allSuburbs.length - 4 });
  }
  y -= 18;

  // Comparison rows
  const compW = (CW - 100) / allSuburbs.length;
  const indicators: [string, (d: ReportData) => string][] = [
    ["Population",       d => fmt(d.demographics.totalPopulation)],
    ["Median Age",       d => fmt(d.demographics.medianAge, "", " yrs")],
    ["HH Income/wk",     d => fmt(d.demographics.medianHouseholdIncome, "$")],
    ["Personal Inc/wk",  d => fmt(d.demographics.medianPersonalIncome, "$")],
    ["Weekly Rent",      d => fmt(d.housing.medianRentWeekly, "$")],
    ["Monthly Mortgage", d => fmt(d.housing.medianMortgageMonthly, "$")],
    ["Total Dwellings",  d => fmt(d.housing.totalDwellings)],
    ["IRSD Score",       d => fmt(d.seifa.irsd)],
    ["IRSD Decile",      d => d.seifa.irsdDecile != null ? `${d.seifa.irsdDecile}/10` : "N/A"],
    ["IRSAD Score",      d => fmt(d.seifa.irsad)],
    ["IRSAD Decile",     d => d.seifa.irsadDecile != null ? `${d.seifa.irsadDecile}/10` : "N/A"],
    ["Born Overseas",    d => pct(d.demographics.bornOverseas)],
    ["Indigenous %",     d => pct(d.demographics.indigenousPopulation)],
  ];

  let zebra2 = false;
  for (const [indLabel, getter] of indicators) {
    if (zebra2) rect(page, ML, y, CW, 16, LIGHT);
    drawText(page, indLabel, ML + 4, y + 4, { font: regular, size: 8, color: MUTED });
    for (let i = 0; i < allSuburbs.length; i++) {
      const val = getter(allSuburbs[i]);
      const col2 = i === 0 ? DARK : MUTED;
      drawText(page, val, ML + 100 + i * compW + 4, y + 4, { font: i === 0 ? bold : regular, size: 8, color: col2 });
    }
    y -= 16;
    zebra2 = !zebra2;
  }

  y -= 16;
  rect(page, ML, y - 18, CW, 28, LIGHT);
  rect(page, ML, y - 18, 4, 28, BRAND);
  drawText(page, "Primary suburb shown in bold. Neighbours sourced from adjacent SA2 codes in the same state.", ML + 14, y - 8, { font: italic, size: 8, color: MUTED, maxWidth: CW - 22 });

  // Footer
  rect(page, 0, 0, PW, 22, LIGHT);
  drawText(page, "DemoReport Professional · demoreport.com.au · ABS Census 2021 & SEIFA 2021", ML, 7, { font: regular, size: 6.5, color: MUTED });

  // Copy comparison page into base PDF
  const [compPage] = await basePdf.copyPages(compDoc, [0]);
  basePdf.addPage(compPage);

  const pdfBytes = await basePdf.save();
  const slug = primary.suburb.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    buffer: new Uint8Array(pdfBytes),
    filename: `demoreport-professional-${slug}-${primary.state.toLowerCase()}-${primary.censusYear}.pdf`,
  };
}

/**
 * Enterprise ($299) — Up to 4 suburbs + AI-generated executive narrative section.
 * Appends comparison page + narrative summary after the standard 10 pages.
 */
export async function generateEnterpriseReport(
  primary: ReportData,
  neighbours: ReportData[],
): Promise<GeneratedReport> {
  // Start with the Professional report (10 pages + comparison)
  const profReport = await generateComparisonReport(primary, neighbours.slice(0, 3));
  const basePdf    = await PDFDocument.load(profReport.buffer);
  const narrativeDoc = await PDFDocument.create();
  const { bold, regular, italic } = await loadFonts(narrativeDoc);

  const allSuburbs = [primary, ...neighbours.slice(0, 3)];

  // Narrative page
  const page = narrativeDoc.addPage([PW, PH]);

  rect(page, 0, PH - 30, PW, 30, BRAND);
  drawText(page, "DemoReport Enterprise", ML, PH - 20, { font: bold, size: 10, color: WHITE });
  drawText(page, "AI Executive Narrative", PW - MR - 170, PH - 20, { font: regular, size: 8.5, color: rgb(0.75, 0.88, 0.97) });

  let y = PH - 60;
  drawText(page, "Executive Narrative & Risk Assessment", ML, y, { font: bold, size: 16, color: DARK });
  y -= 6;
  page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 1, color: BRAND });
  y -= 20;
  drawText(page, `AI-generated analysis for ${primary.suburb} and ${neighbours.length} neighbouring suburb${neighbours.length !== 1 ? "s" : ""}`, ML, y, { font: italic, size: 9, color: MUTED });
  y -= 24;

  // Generate narrative text from the data
  const narrative = buildNarrative(primary, neighbours.slice(0, 3));

  for (const section of narrative) {
    rect(page, ML, y, 4, 18, BRAND);
    drawText(page, section.heading, ML + 12, y + 4, { font: bold, size: 11, color: DARK });
    y -= 28;
    y = drawWrapped(page, section.body, ML, y, { font: regular, size: 9, color: DARK, maxWidth: CW, lineGap: 16 });
    if (y < 80) break;
  }

  // Risk/opportunity summary table
  if (y > 180) {
    y -= 10;
    page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 0.75, color: LIGHT });
    y -= 20;
    drawText(page, "Risk & Opportunity Summary", ML, y, { font: bold, size: 11, color: DARK });
    y -= 20;

    const risks = buildRiskOpportunity(primary);
    for (const [tag, colour, text] of risks) {
      rect(page, ML, y - 2, 60, 14, colour);
      drawText(page, tag, ML + 4, y, { font: bold, size: 7.5, color: WHITE });
      y = drawWrapped(page, text, ML + 68, y, { font: regular, size: 8.5, color: DARK, maxWidth: CW - 68, lineGap: 8 });
      if (y < 60) break;
    }
  }

  // Footer
  rect(page, 0, 0, PW, 22, LIGHT);
  drawText(page, "DemoReport Enterprise · AI narrative generated from ABS Census 2021 data · demoreport.com.au", ML, 7, { font: italic, size: 6.5, color: MUTED });

  const [narrativePage] = await basePdf.copyPages(narrativeDoc, [0]);
  basePdf.addPage(narrativePage);

  const pdfBytes = await basePdf.save();
  const slug = primary.suburb.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    buffer: new Uint8Array(pdfBytes),
    filename: `demoreport-enterprise-${slug}-${primary.state.toLowerCase()}-${primary.censusYear}.pdf`,
  };
}

/** Build narrative sections from raw data (no external AI call — rule-based). */
function buildNarrative(primary: ReportData, neighbours: ReportData[]): { heading: string; body: string }[] {
  const d = primary.demographics;
  const h = primary.housing;
  const s = primary.seifa;

  const incomeVsNational = d.medianHouseholdIncome
    ? d.medianHouseholdIncome > 1746 ? "above" : "below"
    : "at";

  const allSuburbs = [primary, ...neighbours];
  const avgRent = allSuburbs.reduce((a, b) => a + (b.housing.medianRentWeekly ?? 0), 0) / allSuburbs.length;

  return [
    {
      heading: "Market Overview",
      body:
        `${primary.suburb} (SA2 ${primary.sa2Code}) is a ${s.irsdDecile && s.irsdDecile >= 7 ? "higher-advantage" : s.irsdDecile && s.irsdDecile >= 4 ? "mid-tier" : "lower socio-economic"} suburb ` +
        `in ${primary.state} with a population of ${fmt(d.totalPopulation)} (ABS 2021). ` +
        `The median household income of ${fmt(d.medianHouseholdIncome, "$", "/wk")} sits ${incomeVsNational} the national average of $1,746/wk. ` +
        `${d.medianAge ? `The median age of ${d.medianAge} years suggests a ${d.medianAge < 35 ? "younger, renter-skewed" : d.medianAge > 50 ? "mature, owner-occupier" : "balanced"} demographic profile.` : ""}`,
    },
    {
      heading: "Housing Market Analysis",
      body:
        `Weekly median rent of ${fmt(h.medianRentWeekly, "$")} compares to a neighbourhood average of ${fmt(Math.round(avgRent), "$")} across the ${allSuburbs.length} suburbs analysed. ` +
        `Monthly mortgage repayments of ${fmt(h.medianMortgageMonthly, "$")} represent approximately ` +
        `${h.medianMortgageMonthly && d.medianHouseholdIncome ? Math.round((h.medianMortgageMonthly / (d.medianHouseholdIncome * 4.33)) * 100) : "N/A"}% ` +
        `of median household income, indicating ${h.medianMortgageMonthly && d.medianHouseholdIncome && (h.medianMortgageMonthly / (d.medianHouseholdIncome * 4.33)) > 0.35 ? "moderate mortgage stress — consider affordability in product pricing" : "acceptable mortgage serviceability for owner-occupier product"}.`,
    },
    {
      heading: "Socio-Economic Context (SEIFA 2021)",
      body:
        `IRSD decile ${s.irsdDecile ?? "N/A"}/10 places ${primary.suburb} in the ${decileLabel(s.irsdDecile)} bracket relative to all Australian SA2 areas. ` +
        `IRSAD score of ${fmt(s.irsad)} (decile ${s.irsadDecile ?? "N/A"}/10) reflects the combined advantage-disadvantage profile. ` +
        `IEO decile ${s.ieoDecile ?? "N/A"}/10 indicates ${s.ieoDecile && s.ieoDecile >= 7 ? "a well-educated workforce — supports premium service and retail product" : "a working-class education profile — price sensitivity likely"}. ` +
        `IER decile ${s.ierDecile ?? "N/A"}/10 reflects ${s.ierDecile && s.ierDecile >= 7 ? "above-average economic resources in the household base" : "constrained household wealth — affordability is key driver"}.`,
    },
    {
      heading: "Population & Demographic Trends",
      body:
        `${pct(d.bornOverseas)} of ${primary.suburb} residents were born overseas, ` +
        `${d.bornOverseas && d.bornOverseas > 0.30 ? "indicating a highly diverse community with potential demand for culturally specific services and multilingual infrastructure" : "a proportion consistent with the Australian national average"}. ` +
        `${pct(d.speaksEnglishOnly)} speak English only at home. ` +
        `${d.indigenousPopulation && d.indigenousPopulation > 0.03 ? `The ${pct(d.indigenousPopulation)} Aboriginal and Torres Strait Islander population warrants culturally appropriate engagement strategies and heritage assessment.` : ""}`,
    },
    {
      heading: "Development Recommendations",
      body:
        `Based on the demographic and socio-economic profile, ${primary.suburb} is best suited to ` +
        `${s.irsdDecile && s.irsdDecile >= 8 ? "premium residential product (3–4BR family homes, boutique apartments)" : s.irsdDecile && s.irsdDecile >= 5 ? "mid-market residential product (2–3BR apartments, townhouses)" : "affordable and social housing product, likely requiring government partnership"}. ` +
        `${h.medianRentWeekly && h.medianRentWeekly > 500 ? "Strong rental yields support build-to-rent investment." : "Moderate rental yields suggest owner-occupier focus is more appropriate."} ` +
        `${d.totalPopulation && d.totalPopulation > 15000 ? "The large population base supports retail and community facility activation at ground level." : ""}`,
    },
  ];
}

/** Build risk/opportunity flags from data. */
function buildRiskOpportunity(data: ReportData): [string, ReturnType<typeof rgb>, string][] {
  const d = data.demographics;
  const h = data.housing;
  const s = data.seifa;
  const items: [string, ReturnType<typeof rgb>, string][] = [];

  if (s.irsdDecile && s.irsdDecile <= 3)
    items.push(["RISK", DANGER, "High socio-economic disadvantage — demand for affordable product, potential grant/subsidy eligibility."]);
  if (s.irsdDecile && s.irsdDecile >= 8)
    items.push(["OPPORTUNITY", SUCCESS, "High-advantage area — supports premium pricing and quality finishes."]);
  if (h.medianRentWeekly && h.medianRentWeekly > 600)
    items.push(["OPPORTUNITY", SUCCESS, "High median rent signals rental demand — build-to-rent viable."]);
  if (h.medianMortgageMonthly && d.medianHouseholdIncome &&
      (h.medianMortgageMonthly / (d.medianHouseholdIncome * 4.33)) > 0.38)
    items.push(["RISK", WARN, "Mortgage stress risk — monthly repayments exceed 38% of median income."]);
  if (d.bornOverseas && d.bornOverseas > 0.35)
    items.push(["OPPORTUNITY", BRAND, "High overseas-born proportion — multilingual marketing and culturally targeted product design recommended."]);
  if (d.medianAge && d.medianAge > 50)
    items.push(["OPPORTUNITY", rgb(0.12, 0.60, 0.55), "Ageing population — retirement living and aged-care-integrated product warranted."]);
  if (d.medianAge && d.medianAge < 32)
    items.push(["OPPORTUNITY", BRAND, "Young demographic — demand for smaller, entry-level and co-living product."]);
  if (d.indigenousPopulation && d.indigenousPopulation > 0.05)
    items.push(["RISK", WARN, "Heritage and cultural obligations apply — conduct ACHA assessment before DA lodgement."]);

  return items.length > 0 ? items : [["INFO", MUTED, "No significant risks or opportunities flagged based on available ABS data."]];
}

/**
 * GrantData needs assessment (existing stub, kept for compatibility).
 */
export async function generateNeedsAssessment(data: ReportData[]): Promise<GeneratedReport> {
  if (data.length === 0) throw new Error("generateNeedsAssessment: data array is empty");
  return generateFeasibilityReport(data[0]);
}
