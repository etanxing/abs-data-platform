"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fetchReportData } from "@/lib/api";
import type { ReportViewData, SuburbResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

function fmt(n: number | null | undefined, prefix = "", suffix = ""): string {
  if (n == null) return "—";
  return `${prefix}${n.toLocaleString("en-AU")}${suffix}`;
}
function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
function decileLabel(d: number | null | undefined): string {
  if (d == null) return "—";
  if (d <= 2) return "High disadvantage";
  if (d <= 4) return "Above-average disadvantage";
  if (d <= 6) return "Average";
  if (d <= 8) return "Below-average disadvantage";
  return "Low disadvantage";
}
function decileColour(d: number | null | undefined): string {
  if (d == null) return "#9ca3af";
  if (d <= 3) return "#ef4444";
  if (d <= 6) return "#f59e0b";
  return "#22c55e";
}

function KVRow({ label, value, note, zebra }: { label: string; value: string; note?: string; zebra?: boolean }) {
  return (
    <tr style={{ background: zebra ? "#f9fafb" : "white" }}>
      <td style={{ padding: "7px 10px", fontSize: 13, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>{label}</td>
      <td style={{ padding: "7px 10px", fontSize: 13, fontWeight: 600, color: "#111827", borderBottom: "1px solid #f3f4f6" }}>{value}</td>
      <td style={{ padding: "7px 10px", fontSize: 11, color: "#9ca3af", borderBottom: "1px solid #f3f4f6" }}>{note}</td>
    </tr>
  );
}

function AgeBar({ label, value }: { label: string; value: number | null }) {
  const pctVal = value != null ? (value * 100).toFixed(1) : null;
  const barW = value != null ? Math.min(value * 500, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ width: 60, fontSize: 12, color: "#6b7280", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 3, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${barW}%`, height: "100%", background: "#2563eb", borderRadius: 3 }} />
      </div>
      <span style={{ width: 44, textAlign: "right", fontSize: 12, color: "#374151" }}>{pctVal != null ? `${pctVal}%` : "—"}</span>
    </div>
  );
}

function LangBar({ label, value }: { label: string; value: number }) {
  const barW = Math.min(value * 500, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ width: 140, fontSize: 12, color: "#374151", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 3, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${barW}%`, height: "100%", background: "#7c3aed", borderRadius: 3 }} />
      </div>
      <span style={{ width: 44, textAlign: "right", fontSize: 12, color: "#374151" }}>{(value * 100).toFixed(1)}%</span>
    </div>
  );
}

function SeifaCard({ code, name, score, decile, desc }: { code: string; name: string; score: number | null; decile: number | null; desc: string }) {
  const colour = decileColour(decile);
  return (
    <div style={{ border: `1px solid #e5e7eb`, borderLeft: `4px solid ${colour}`, borderRadius: 6, padding: "14px 16px", marginBottom: 12, display: "flex", gap: 20 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{code}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: colour, marginTop: 2 }}>Score: {fmt(score)}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>Decile</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: colour }}>{decile ?? "—"}<span style={{ fontSize: 12, color: "#9ca3af" }}>/10</span></div>
        <div style={{ fontSize: 10, color: "#6b7280", fontStyle: "italic" }}>{decileLabel(decile)}</div>
        <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 1, background: i < (decile ?? 0) ? colour : "#e5e7eb" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SuburbCompCard({ data, isPrimary }: { data: SuburbResponse; isPrimary: boolean }) {
  const d = data.demographics;
  const h = data.housing;
  const s = data.seifa;
  const border = isPrimary ? "2px solid #2563eb" : "1px solid #e5e7eb";
  return (
    <div style={{ border, borderRadius: 8, overflow: "hidden", flex: 1, minWidth: 160 }}>
      <div style={{ background: isPrimary ? "#eff6ff" : "#f9fafb", padding: "10px 12px", borderBottom: border }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{data.suburb}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{data.state}{data.postcode ? ` · ${data.postcode}` : ""}</div>
        {isPrimary && <span style={{ fontSize: 10, fontWeight: 600, background: "#2563eb", color: "white", padding: "1px 6px", borderRadius: 4, marginTop: 2, display: "inline-block" }}>Primary</span>}
      </div>
      <div style={{ padding: "10px 12px" }}>
        {[
          ["Population", fmt(d.totalPopulation)],
          ["Median Age", fmt(d.medianAge, "", " yrs")],
          ["HH Income", fmt(d.medianHouseholdIncome, "$", "/wk")],
          ["Median Rent", fmt(h.medianRentWeekly, "$", "/wk")],
          ["Owner Occ.", pct(h.ownerOccupied)],
          ["IRSD", `${s.irsdDecile ?? "—"}/10`],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#6b7280" }}>{label}</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: 860,
  margin: "24px auto",
  background: "white",
  boxShadow: "0 1px 3px rgba(0,0,0,.1)",
  borderRadius: 8,
  padding: "40px 48px",
};

function ReportContent({ data, reportId }: { data: ReportViewData; reportId: string }) {
  const p = data.primary;
  const d = p.demographics;
  const h = p.housing;
  const s = p.seifa;
  const ad = d.ageDistribution;
  const suburb = p.suburb;

  const isPro = data.plan !== "single";

  // Derived values (mirroring PDF logic)
  const workingAge = (ad["25_34"] ?? 0) + (ad["35_44"] ?? 0) + (ad["45_54"] ?? 0);
  const youth      = (ad["0_4"] ?? 0) + (ad["5_14"] ?? 0) + (ad["15_24"] ?? 0);
  const seniors    = (ad["65_74"] ?? 0) + (ad["75_plus"] ?? 0);
  const depRatio   = workingAge > 0 ? ((youth + seniors) / workingAge).toFixed(2) : "N/A";

  const irsdDecile = s.irsdDecile ?? 0;
  const affluence  = irsdDecile >= 8 ? "an affluent" : irsdDecile >= 5 ? "a mid-tier" : "a lower socio-economic";
  const execSummary =
    `${suburb} is ${affluence} suburb with ${d.totalPopulation != null ? d.totalPopulation.toLocaleString("en-AU") + " residents" : "residents"} recorded in the 2021 ABS Census.` +
    (d.medianAge != null ? ` The median age of ${d.medianAge} years ${d.medianAge < 35 ? "indicates a younger, potentially first-home-buyer demographic." : d.medianAge > 45 ? "indicates an older, established residential demographic." : "reflects a broad age mix across the community."}` : "");

  const compositeScore = [
    s.irsdDecile ?? 5,
    s.irsadDecile ?? 5,
    d.medianHouseholdIncome ? Math.min(10, Math.round(d.medianHouseholdIncome / 350)) : 5,
    h.medianRentWeekly ? Math.max(1, 10 - Math.round(h.medianRentWeekly / 120)) : 5,
  ];
  const avgScore = compositeScore.reduce((a, b) => a + b, 0) / compositeScore.length;
  const stars = Math.round(avgScore / 2);

  const nationals = [
    { label: "Median Age",           val: d.medianAge,               nat: 38,    fmtFn: (v: number) => `${v} yrs` },
    { label: "Median HH Income",     val: d.medianHouseholdIncome,   nat: 1746,  fmtFn: (v: number) => `$${v}/wk` },
    { label: "Median Personal Inc.", val: d.medianPersonalIncome,    nat: 805,   fmtFn: (v: number) => `$${v}/wk` },
    { label: "Median Weekly Rent",   val: h.medianRentWeekly,        nat: 400,   fmtFn: (v: number) => `$${v}/wk` },
    { label: "Monthly Mortgage",     val: h.medianMortgageMonthly,   nat: 1900,  fmtFn: (v: number) => `$${v}/mo` },
    { label: "IRSD Score",           val: s.irsd,                    nat: 1000,  fmtFn: (v: number) => `${v}` },
    { label: "IRSAD Score",          val: s.irsad,                   nat: 1000,  fmtFn: (v: number) => `${v}` },
  ];

  const toc = [
    ["Executive Summary", 2],
    ["Section 1 — Population & Demographics", 3],
    ["Section 2 — Age Distribution", 4],
    ["Section 3 — Income & Employment", 5],
    ["Section 4 — Housing Stock & Tenure", 6],
    ["Section 5 — SEIFA Socio-Economic Indices", 7],
    ["Section 6 — Language & Cultural Diversity", 8],
    ["Section 7 — Suburb Comparison Snapshot", 9],
    ["Data Sources & Methodology", 10],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; color: #111827; background: #f3f4f6; }
        @media print {
          body { background: white; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; page-break-after: always; display: flex !important; flex-direction: column !important; height: 297mm !important; }
          .report-page:last-child { page-break-after: avoid; }
          .report-page > *:last-child { margin-top: auto !important; }
          @page { size: A4; margin: 0; }
        }
        .action-bar {
          position: sticky; top: 0; z-index: 100;
          background: white; border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px; display: flex; align-items: center; gap: 12px;
        }
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500;
          cursor: pointer; border: none; text-decoration: none;
        }
        .btn-primary { background: #2563eb; color: white; }
        .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
        .section-title {
          font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
          color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px;
          margin-top: 28px;
        }
        table.kv { width: 100%; border-collapse: collapse; }
        table.kv tr:last-child td { border-bottom: none !important; }
        .page-footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
      `}</style>

      {/* Action bar */}
      <div className="action-bar no-print">
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#374151" }}>{suburb} — ABS Demographic Feasibility Report</span>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save PDF
        </button>
        <a className="btn btn-primary" href={`${API_URL}/api/report/${reportId}/download`} download>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </a>
      </div>

      {/* ── PAGE 1: Cover ── */}
      <div className="report-page" style={PAGE_STYLE}>
        {/* Brand header */}
        <div style={{ background: "#1d4ed8", margin: "-40px -48px 32px", padding: "32px 48px 28px", borderRadius: "8px 8px 0 0" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "white" }}>DemoReport</div>
          <div style={{ fontSize: 14, color: "#93c5fd", marginTop: 2 }}>Demographic Feasibility Report</div>
          <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 2, fontStyle: "italic" }}>Powered by ABS Census 2021 &amp; SEIFA 2021</div>
          <div style={{ background: "#1e3a8a", borderRadius: 6, padding: "14px 16px", marginTop: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>{suburb}</div>
            <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 4 }}>
              {p.state}{p.lga ? ` · ${p.lga}` : ""}{p.postcode ? ` · Postcode ${p.postcode}` : ""} · SA2 {p.sa2Code} · Census {p.censusYear}
            </div>
          </div>
        </div>

        {/* 6-stat grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Total Population", value: fmt(d.totalPopulation), sub: "residents (ABS 2021)", accent: "#2563eb" },
            { label: "Median Age", value: fmt(d.medianAge, "", " yrs"), sub: "across all residents", accent: "#22c55e" },
            { label: "Median HH Income", value: fmt(d.medianHouseholdIncome, "$", "/wk"), sub: "household weekly income", accent: "#f59e0b" },
            { label: "Median Personal Income", value: fmt(d.medianPersonalIncome, "$", "/wk"), sub: "personal weekly income", accent: "#7c3aed" },
            { label: "Median Weekly Rent", value: fmt(h.medianRentWeekly, "$", "/wk"), sub: "private dwellings", accent: "#0f9488" },
            { label: "Median Mortgage", value: fmt(h.medianMortgageMonthly, "$", "/mo"), sub: "monthly repayment", accent: "#be185d" },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderTop: `3px solid ${accent}`, borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Table of contents */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Report Contents</div>
          {toc.map(([title, pg]) => (
            <div key={title as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px dashed #f3f4f6", color: "#374151" }}>
              <span>{title as string}</span>
              <span style={{ color: "#9ca3af", fontWeight: 500 }}>{pg}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>
          Generated: {new Date(data.generatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} · demoreport.workswell.com.au · Page 1 of 10
        </div>
      </div>

      {/* ── PAGE 2: Executive Summary ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>Executive Summary</div>
        <div style={{ height: 3, background: "#2563eb", margin: "8px 0 20px" }} />

        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 24 }}>{execSummary}</p>

        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Key Findings</div>
        {[
          {
            title: "Socio-Economic Status",
            body: `IRSD decile ${s.irsdDecile ?? "N/A"}/10 places ${suburb} in the ${decileLabel(s.irsdDecile).toLowerCase()} bracket nationally. IRSAD score of ${fmt(s.irsad)} reflects ${s.irsadDecile && s.irsadDecile >= 7 ? "above-average" : "below-average"} socio-economic advantage and disadvantage.`,
            accent: decileColour(s.irsdDecile),
          },
          {
            title: "Housing Affordability",
            body: `Median weekly rent of ${fmt(h.medianRentWeekly, "$")} and monthly mortgage repayment of ${fmt(h.medianMortgageMonthly, "$")} suggest ${h.medianRentWeekly && h.medianRentWeekly > 500 ? "a higher-cost" : "a moderate-cost"} rental and ownership market. Total dwellings: ${fmt(h.totalDwellings)}.`,
            accent: "#2563eb",
          },
          {
            title: "Income Profile",
            body: `Median household income of ${fmt(d.medianHouseholdIncome, "$", "/wk")} and personal income of ${fmt(d.medianPersonalIncome, "$", "/wk")} indicate ${d.medianHouseholdIncome && d.medianHouseholdIncome > 1800 ? "above-average" : "average"} earning capacity relative to the national median (~$1,746/wk).`,
            accent: "#22c55e",
          },
          {
            title: "Population Composition",
            body: `${pct(d.indigenousPopulation)} of residents identify as Aboriginal or Torres Strait Islander. ${d.bornOverseas != null ? `${pct(d.bornOverseas)} were born overseas.` : ""} The suburb has ${d.totalPopulation && d.totalPopulation > 15000 ? "a large" : d.totalPopulation && d.totalPopulation > 5000 ? "a medium" : "a smaller"} population base.`,
            accent: "#f59e0b",
          },
        ].map(({ title, body, accent }) => (
          <div key={title} style={{ borderLeft: `4px solid ${accent}`, background: "#f9fafb", borderRadius: "0 6px 6px 0", padding: "12px 16px", marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}

        <div style={{ marginTop: 20, fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
          Note: This executive summary is automatically generated from ABS 2021 Census data. Refer to individual sections for full detail.
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 2 of 10</div>
      </div>

      {/* ── PAGE 3: Section 1 — Population & Demographics ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 1 — Population &amp; Demographics</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>ABS Census 2021 · SA2 Level</span>
        </div>
        <table className="kv">
          <tbody>
            {[
              ["Total Population", fmt(d.totalPopulation), "persons (usual residents)"],
              ["Median Age", fmt(d.medianAge, "", " years"), "across all residents"],
              ["Median Household Income", fmt(d.medianHouseholdIncome, "$", "/wk"), "weekly (before tax)"],
              ["Median Personal Income", fmt(d.medianPersonalIncome, "$", "/wk"), "weekly (before tax)"],
              ["Aboriginal & Torres Strait Islander", pct(d.indigenousPopulation), "of total population"],
              ["Born Overseas", pct(d.bornOverseas), "of total population"],
              ["Speaks English Only at Home", pct(d.speaksEnglishOnly), "of total population"],
              ["Families with Children", pct(d.familiesWithChildren), "of all family households"],
              ["Single-Parent Families", pct(d.singleParentFamilies), "of all family households"],
            ].map(([label, value, note], i) => (
              <KVRow key={label} label={label} value={value} note={note} zebra={i % 2 === 0} />
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Interpretation</div>
        <div style={{ borderLeft: "4px solid #2563eb", background: "#f9fafb", padding: "12px 16px", fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
          With a median age of {fmt(d.medianAge, "", " years")} and median household income of {fmt(d.medianHouseholdIncome, "$", "/wk")}, {suburb} presents a {d.medianAge && d.medianAge < 38 ? "younger, family-forming" : "more established"} demographic profile.
          {d.indigenousPopulation && d.indigenousPopulation > 0.05 ? " The above-average Indigenous population proportion should inform cultural engagement planning." : ""}
          {d.bornOverseas && d.bornOverseas > 0.30 ? " High overseas-born proportion suggests strong demand for multilingual services." : ""}
        </div>
        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 3 of 10</div>
      </div>

      {/* ── PAGE 4: Section 2 — Age Distribution ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 2 — Age Distribution</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>Five-year age groups · ABS Census 2021</span>
        </div>

        {[
          ["0–4 yrs", ad["0_4"]], ["5–14 yrs", ad["5_14"]], ["15–24 yrs", ad["15_24"]],
          ["25–34 yrs", ad["25_34"]], ["35–44 yrs", ad["35_44"]], ["45–54 yrs", ad["45_54"]],
          ["55–64 yrs", ad["55_64"]], ["65–74 yrs", ad["65_74"]], ["75+ yrs", ad["75_plus"]],
        ].map(([label, val]) => (
          <AgeBar key={label as string} label={label as string} value={val as number | null} />
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Age Band Analysis</div>
        <table className="kv">
          <tbody>
            <KVRow label="Working Age (25–54)" value={pct(workingAge)} note={workingAge > 0.45 ? "Strong working-age core — supports services demand" : "Below average working-age presence"} zebra={false} />
            <KVRow label="Youth (0–24)" value={pct(youth)} note={youth > 0.30 ? "Young population — family-service infrastructure demand" : "Moderate youth cohort"} zebra={true} />
            <KVRow label="Seniors (65+)" value={pct(seniors)} note={seniors > 0.20 ? "Ageing population — aged care & healthcare demand" : "Below-average senior cohort"} zebra={false} />
          </tbody>
        </table>

        <div style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb", padding: "12px 16px", marginTop: 20, borderRadius: "0 6px 6px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>Estimated Dependency Ratio: {depRatio}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Ratio of dependants (youth + seniors) to working-age population. Lower = more economically active community.</div>
        </div>
        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 4 of 10</div>
      </div>

      {/* ── PAGE 5: Section 3 — Income & Employment ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 3 — Income &amp; Employment</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>ABS Census 2021 · SA2 Level</span>
        </div>
        <table className="kv">
          <tbody>
            <KVRow label="Median Household Income" value={fmt(d.medianHouseholdIncome, "$", "/wk")} note="weekly, before tax" zebra={false} />
            <KVRow label="Median Personal Income" value={fmt(d.medianPersonalIncome, "$", "/wk")} note="weekly, before tax" zebra={true} />
            <KVRow label="Annualised HH Income" value={fmt(d.medianHouseholdIncome ? d.medianHouseholdIncome * 52 : null, "$")} note="estimated annual" zebra={false} />
            <KVRow label="Annualised Personal" value={fmt(d.medianPersonalIncome ? d.medianPersonalIncome * 52 : null, "$")} note="estimated annual" zebra={true} />
            <KVRow
              label="vs National Median HH"
              value={d.medianHouseholdIncome != null ? (d.medianHouseholdIncome > 1746 ? `+$${(d.medianHouseholdIncome - 1746).toFixed(0)}/wk above` : `-$${(1746 - d.medianHouseholdIncome).toFixed(0)}/wk below`) : "N/A"}
              note="national median ~$1,746/wk (ABS 2021)"
              zebra={false}
            />
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Income Context for Development Planning</div>
        {[
          `Household income of ${fmt(d.medianHouseholdIncome, "$", "/wk")} implies maximum comfortable mortgage (30% income rule) of approx. ${fmt(d.medianHouseholdIncome ? Math.round(d.medianHouseholdIncome * 0.3 * 52 / 12) : null, "$", "/mo")}.`,
          `Personal income suggests ${d.medianPersonalIncome && d.medianPersonalIncome > 800 ? "a predominantly full-time employed" : "a mixed employment"} workforce profile.`,
          `${d.medianHouseholdIncome && d.medianHouseholdIncome > 2000 ? "Above-average household income indicates market capacity for premium residential product." : "Moderate incomes suggest demand for mid-market or affordable housing typologies."}`,
        ].map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, background: "#2563eb", borderRadius: 1, flexShrink: 0, marginTop: 5 }} />
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{pt}</div>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>Limitations</div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", lineHeight: 1.6 }}>
          Census income data is self-reported and may underrepresent investment income, trusts, and business income. Employment status data (labour force participation, unemployment) is available in ABS TableBuilder but not included in the standard GCP short-header DataPack used here.
        </div>
        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 5 of 10</div>
      </div>

      {/* ── PAGE 6: Section 4 — Housing Stock & Tenure ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 4 — Housing Stock &amp; Tenure</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>ABS Census 2021 · SA2 Level</span>
        </div>
        <table className="kv">
          <tbody>
            <KVRow label="Total Dwellings" value={fmt(h.totalDwellings)} note="all private dwellings" zebra={false} />
            <KVRow label="Median Weekly Rent" value={fmt(h.medianRentWeekly, "$", "/wk")} note="private rental market" zebra={true} />
            <KVRow label="Median Monthly Mortgage" value={fmt(h.medianMortgageMonthly, "$", "/mo")} note="owner-occupier repayment" zebra={false} />
            <KVRow label="Median House Price" value={fmt(h.medianHousePrice, "$")} note="if available" zebra={true} />
            <KVRow label="Owner-Occupied" value={pct(h.ownerOccupied)} note="of all dwellings" zebra={false} />
            <KVRow label="Renting" value={pct(h.renting)} note="private rental" zebra={true} />
            <KVRow label="Social / Public Housing" value={pct(h.socialHousing)} note="government-managed" zebra={false} />
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Tenure Profile</div>
        {[
          { label: "Owner-Occupied", val: h.ownerOccupied, colour: "#22c55e" },
          { label: "Renting", val: h.renting, colour: "#2563eb" },
          { label: "Social Housing", val: h.socialHousing, colour: "#f59e0b" },
        ].map(({ label, val, colour }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 120, fontSize: 12, color: "#374151" }}>{label}</span>
            <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 14, overflow: "hidden" }}>
              <div style={{ width: `${val != null ? val * 100 : 0}%`, height: "100%", background: colour }} />
            </div>
            <span style={{ width: 44, textAlign: "right", fontSize: 12, fontWeight: 600, color: "#111827" }}>{pct(val)}</span>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Planning Implications</div>
        {[
          `${h.ownerOccupied != null ? (h.ownerOccupied * 100).toFixed(0) : "N/A"}% owner-occupier rate indicates a ${h.ownerOccupied && h.ownerOccupied > 0.65 ? "predominantly owner-occupier community — stable demand for quality family product." : "mixed tenure profile — opportunity for both rental and ownership product."}`,
          `${h.medianRentWeekly && h.medianRentWeekly > 500 ? "High" : "Moderate"} rental pressure (${fmt(h.medianRentWeekly, "$", "/wk")}) ${h.medianRentWeekly && h.medianRentWeekly > 500 ? "suggests undersupply — strong case for new rental product." : "suggests a balanced rental market."}`,
          `Mortgage serviceability: ${fmt(h.medianMortgageMonthly, "$", "/mo")} median repayment relative to ${fmt(d.medianHouseholdIncome, "$", "/wk")} household income suggests ${h.medianMortgageMonthly && d.medianHouseholdIncome ? ((h.medianMortgageMonthly / (d.medianHouseholdIncome * 4.33)) * 100).toFixed(0) + "% of income on mortgage." : "serviceability data unavailable."}`,
        ].map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, background: "#22c55e", borderRadius: 1, flexShrink: 0, marginTop: 5 }} />
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{pt}</div>
          </div>
        ))}
        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 6 of 10</div>
      </div>

      {/* ── PAGE 7: Section 5 — SEIFA ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 5 — SEIFA Socio-Economic Indices</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>ABS SEIFA 2021 · SA2 Level</span>
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", marginBottom: 20, lineHeight: 1.6 }}>
          SEIFA (Socio-Economic Indexes for Areas) measures the relative socio-economic advantage and disadvantage of Australian communities. Scores and deciles are relative to all SA2 areas nationally.
        </p>

        <SeifaCard code="IRSD" name="Index of Relative Socio-Economic Disadvantage" score={s.irsd} decile={s.irsdDecile} desc="Measures disadvantage only. Lower score = more disadvantaged. Constructed from Census variables related to low income, low educational attainment, high unemployment, and jobs in relatively unskilled occupations." />
        <SeifaCard code="IRSAD" name="Index of Relative Socio-Economic Advantage & Disadvantage" score={s.irsad} decile={s.irsadDecile} desc="Measures both extremes — advantage and disadvantage simultaneously. Captures both high and low-income households, education, and occupation." />
        <SeifaCard code="IER" name="Index of Economic Resources" score={s.ier} decile={s.ierDecile} desc="Focuses on income, wealth, and housing costs. Includes variables such as household income, rent, mortgage, and dwelling ownership." />
        <SeifaCard code="IEO" name="Index of Education and Occupation" score={s.ieo} decile={s.ieoDecile} desc="Measures education levels and occupational skill. Includes highest qualification, occupation category, and labour force participation." />

        <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>
          Decile 1 = most disadvantaged 10% of SA2 areas nationally. Decile 10 = most advantaged 10%.
        </div>
        <div style={{ marginTop: 16, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 7 of 10</div>
      </div>

      {/* ── PAGE 8: Section 6 — Language & Cultural Diversity ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 6 — Language &amp; Cultural Diversity</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>ABS Census 2021 · SA2 Level</span>
        </div>
        <table className="kv">
          <tbody>
            <KVRow label="Speaks English Only" value={pct(d.speaksEnglishOnly)} note="of population at home" zebra={false} />
            <KVRow label="Born Overseas" value={pct(d.bornOverseas)} note="of total population" zebra={true} />
            <KVRow label="Indigenous Population" value={pct(d.indigenousPopulation)} note="Aboriginal & Torres Strait Islander" zebra={false} />
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Top Languages Spoken at Home</div>
        {d.topLanguages.length > 0 ? (
          d.topLanguages.slice(0, 8).map((l) => <LangBar key={l.language} label={l.language} value={l.pct} />)
        ) : (
          <div style={{ background: "#f9fafb", borderRadius: 6, padding: "14px 16px", fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
            Language diversity breakdown (G13) was not available in the short-header Census DataPack for this area. Full language data is available via ABS TableBuilder.
          </div>
        )}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Cultural Planning Considerations</div>
        {[
          d.speaksEnglishOnly != null && d.speaksEnglishOnly < 0.60
            ? `${pct(1 - (d.speaksEnglishOnly ?? 0))} of residents speak a language other than English at home — bilingual services and multilingual signage should be considered.`
            : `${pct(d.speaksEnglishOnly)} English-only rate indicates a predominantly English-speaking community — standard service delivery is appropriate.`,
          d.bornOverseas != null && d.bornOverseas > 0.25
            ? `High overseas-born population (${pct(d.bornOverseas)}) suggests diverse cultural traditions and potential demand for culturally specific services, food retail, and community facilities.`
            : `Overseas-born population of ${pct(d.bornOverseas)} is within typical range for Australian suburbs.`,
          d.indigenousPopulation != null && d.indigenousPopulation > 0.02
            ? `Aboriginal and Torres Strait Islander population (${pct(d.indigenousPopulation)}) — culturally appropriate engagement, consultation, and heritage assessment obligations apply.`
            : `Indigenous population proportion is below 2% — standard consultation processes apply, though cultural heritage obligations remain.`,
        ].map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, background: "#7c3aed", borderRadius: 1, flexShrink: 0, marginTop: 5 }} />
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{pt}</div>
          </div>
        ))}
        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 8 of 10</div>
      </div>

      {/* ── PAGE 9: Section 7 — Suburb Comparison Snapshot ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ background: "#f9fafb", borderLeft: "4px solid #2563eb", padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Section 7 — Suburb Comparison Snapshot</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 10 }}>National benchmarks · ABS Census 2021</span>
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", marginBottom: 16 }}>How {suburb} compares to national averages across key indicators</p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#1d4ed8" }}>
              <th style={{ padding: "9px 10px", color: "white", textAlign: "left", fontWeight: 600 }}>Indicator</th>
              <th style={{ padding: "9px 10px", color: "white", textAlign: "right", fontWeight: 600 }}>{suburb}</th>
              <th style={{ padding: "9px 10px", color: "white", textAlign: "right", fontWeight: 600 }}>National Avg</th>
              <th style={{ padding: "9px 10px", color: "white", textAlign: "right", fontWeight: 600 }}>vs National</th>
            </tr>
          </thead>
          <tbody>
            {nationals.map(({ label, val, nat, fmtFn }, i) => {
              const diff = val != null ? val - nat : null;
              const diffPct = diff != null ? ((diff / nat) * 100).toFixed(1) : null;
              const pos = diff != null && diff >= 0;
              return (
                <tr key={label} style={{ background: i % 2 === 0 ? "#f9fafb" : "white" }}>
                  <td style={{ padding: "8px 10px", color: "#374151", borderBottom: "1px solid #f3f4f6" }}>{label}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#111827", borderBottom: "1px solid #f3f4f6" }}>{val != null ? fmtFn(val) : "—"}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#9ca3af", borderBottom: "1px solid #f3f4f6" }}>{fmtFn(nat)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: diffPct ? (pos ? "#22c55e" : "#ef4444") : "#9ca3af", borderBottom: "1px solid #f3f4f6" }}>
                    {diffPct != null ? `${pos ? "+" : ""}${diffPct}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>National averages sourced from ABS 2021 Census national SA2 median values.</div>

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Overall Suburb Rating</div>
        <div style={{ borderLeft: `4px solid ${decileColour(Math.round(avgScore))}`, background: "#f9fafb", padding: "14px 16px", borderRadius: "0 6px 6px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Composite Score: {avgScore.toFixed(1)} / 10</div>
          <div style={{ fontSize: 22, color: "#f59e0b", marginTop: 4, letterSpacing: 2 }}>
            {"★".repeat(stars)}{"☆".repeat(5 - stars)}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontStyle: "italic" }}>Based on SEIFA indices, income, and housing affordability metrics.</div>
        </div>

        {isPro && data.neighbours.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Neighbouring Suburbs</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <SuburbCompCard data={p} isPrimary />
              {data.neighbours.map((n) => <SuburbCompCard key={n.sa2Code} data={n} isPrimary={false} />)}
            </div>
          </>
        )}
        <div style={{ marginTop: 20, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 9 of 10</div>
      </div>

      {/* ── PAGE 10: Data Sources & Methodology ── */}
      <div className="report-page" style={PAGE_STYLE}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>Data Sources &amp; Methodology</div>
        <div style={{ height: 3, background: "#2563eb", margin: "8px 0 20px" }} />

        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Primary Data Sources</div>
        {[
          {
            title: "ABS Census 2021 — General Community Profile (GCP)",
            source: "Australian Bureau of Statistics · abs.gov.au",
            desc: "Provides population, age, income, housing tenure, and language diversity at SA2 level. Short-header DataPack used (Tables G01, G04, G09, G17, G33, G36).",
          },
          {
            title: "ABS SEIFA 2021 — Socio-Economic Indexes for Areas",
            source: "Australian Bureau of Statistics · abs.gov.au",
            desc: "Four composite indices (IRSD, IRSAD, IER, IEO) computed from 2021 Census data. SA2-level scores and decile rankings relative to all SA2 areas nationally.",
          },
          {
            title: "ASGS Edition 3 — Australian Statistical Geography Standard",
            source: "Australian Bureau of Statistics · abs.gov.au",
            desc: "SA2 to Postcode concordance via Mesh Block allocation files (MB_2021_AUST.xlsx, POA_2021_AUST.xlsx). Suburb-to-SA2 mapping via SAL_2021_AUST.xlsx.",
          },
        ].map(({ title, source, desc }) => (
          <div key={title} style={{ borderLeft: "4px solid #2563eb", background: "#f9fafb", padding: "12px 16px", marginBottom: 12, borderRadius: "0 6px 6px 0" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#2563eb", fontStyle: "italic", margin: "4px 0" }}>{source}</div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Methodology</div>
        {[
          "All data is sourced from official ABS publications. No data has been adjusted, interpolated, or modelled.",
          "SA2 (Statistical Area Level 2) is the primary geography for all indicators. SA2 areas correspond approximately to suburb boundaries.",
          "Where a suburb spans multiple SA2 areas, all matching SA2s are returned and the user selects the relevant area.",
          "Percentage values (e.g. age bands, tenure type) are expressed as proportions of the relevant population denominator.",
          "Housing price data (medianHousePrice) is not available in the standard Census DataPack — it requires CoreLogic or Domain integration and is shown as N/A where not available.",
          "Language diversity data requires the G13 (Language Spoken at Home) Census table which is not included in the short-header GCP DataPack. Full data is available in ABS TableBuilder.",
        ].map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{ width: 5, height: 5, background: "#9ca3af", borderRadius: 1, flexShrink: 0, marginTop: 5 }} />
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{pt}</div>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>Disclaimer</div>
        <p style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", lineHeight: 1.7 }}>
          This report is generated automatically from publicly available ABS data. DemoReport makes no representations as to the accuracy, completeness, or suitability of this information for any particular purpose. This report does not constitute financial, investment, planning, or legal advice. Users should seek independent professional advice before making decisions based on this information. Data reflects the 2021 Census period and may not reflect current conditions.
        </p>

        <div style={{ background: "#1d4ed8", borderRadius: 6, padding: "14px 16px", marginTop: 20, textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>Thank you for using DemoReport · demoreport.workswell.com.au</div>
        </div>
        <div style={{ marginTop: 16, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Page 10 of 10</div>
      </div>
    </>
  );
}

function ViewContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id") ?? "";
  const [data, setData] = useState<ReportViewData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!reportId) { setError(true); return; }
    fetchReportData(reportId).then((d) => { if (d) setData(d); else setError(true); });
  }, [reportId]);

  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Report not found or not ready yet.</div>;
  if (!data) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  return <ReportContent data={data} reportId={reportId} />;
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ width: 32, height: 32, border: "3px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ViewContent />
    </Suspense>
  );
}
