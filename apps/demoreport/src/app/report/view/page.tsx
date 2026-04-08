"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fetchReportData } from "@/lib/api";
import type { ReportViewData, SuburbResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

function fmt(n: number | null, prefix = "", suffix = ""): string {
  if (n == null) return "—";
  return `${prefix}${n.toLocaleString()}${suffix}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function decileLabel(d: number | null): string {
  if (d == null) return "—";
  return `${d}/10`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function SeifaBar({ label, decile }: { label: string; decile: number | null }) {
  const pct = decile != null ? (decile / 10) * 100 : 0;
  const colour = decile == null ? "#d1d5db"
    : decile <= 3 ? "#ef4444"
    : decile <= 6 ? "#f59e0b"
    : "#22c55e";
  return (
    <div className="seifa-row">
      <div className="seifa-label">{label}</div>
      <div className="seifa-bar-wrap">
        <div className="seifa-bar" style={{ width: `${pct}%`, background: colour }} />
      </div>
      <div className="seifa-score">{decileLabel(decile)}</div>
    </div>
  );
}

function SuburbCard({ data, isPrimary }: { data: SuburbResponse; isPrimary: boolean }) {
  const d = data.demographics;
  const h = data.housing;
  const s = data.seifa;
  return (
    <div className={`suburb-card ${isPrimary ? "primary" : ""}`}>
      <div className="suburb-card-header">
        <span className="suburb-name">{data.suburb}</span>
        <span className="suburb-meta">{data.state}{data.postcode ? ` · ${data.postcode}` : ""}</span>
        {isPrimary && <span className="primary-badge">Primary</span>}
      </div>
      <div className="suburb-card-stats">
        <div><span className="cs-label">Population</span><span className="cs-val">{fmt(d.totalPopulation)}</span></div>
        <div><span className="cs-label">Median Age</span><span className="cs-val">{fmt(d.medianAge)}</span></div>
        <div><span className="cs-label">HH Income</span><span className="cs-val">{fmt(d.medianHouseholdIncome, "$")}</span></div>
        <div><span className="cs-label">Median Rent</span><span className="cs-val">{fmt(h.medianRentWeekly, "$", "/wk")}</span></div>
        <div><span className="cs-label">Owner Occ.</span><span className="cs-val">{fmtPct(h.ownerOccupied)}</span></div>
        <div><span className="cs-label">SEIFA IRSD</span><span className="cs-val">{decileLabel(s.irsdDecile)}</span></div>
      </div>
    </div>
  );
}

function ReportContent({ data, reportId }: { data: ReportViewData; reportId: string }) {
  const p = data.primary;
  const d = p.demographics;
  const h = p.housing;
  const s = p.seifa;
  const isPro = data.plan !== "single";

  const ageRows: [string, keyof typeof d.ageDistribution][] = [
    ["0–4", "0_4"], ["5–14", "5_14"], ["15–24", "15_24"], ["25–34", "25_34"],
    ["35–44", "35_44"], ["45–54", "45_54"], ["55–64", "55_64"], ["65–74", "65_74"], ["75+", "75_plus"],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; color: #111827; background: #f3f4f6; }

        .no-print { }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .report-page { box-shadow: none; margin: 0; padding: 20mm 18mm; }
          .page-break { page-break-before: always; }
          @page { size: A4; margin: 0; }
        }

        .action-bar {
          position: sticky; top: 0; z-index: 100;
          background: white; border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px; display: flex; align-items: center; gap: 12px;
        }
        .action-bar-title { flex: 1; font-size: 15px; font-weight: 600; color: #374151; }
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500;
          cursor: pointer; border: none; text-decoration: none; transition: opacity 0.15s;
        }
        .btn:hover { opacity: 0.85; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }

        .report-page {
          max-width: 860px; margin: 24px auto; background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,.1); border-radius: 8px;
          padding: 40px 48px;
        }

        /* Cover */
        .cover-header { border-bottom: 3px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
        .report-badge { font-size: 12px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
        .cover-title { font-size: 32px; font-weight: 700; color: #111827; line-height: 1.2; }
        .cover-meta { font-size: 14px; color: #6b7280; margin-top: 6px; }

        /* Sections */
        .section { margin-top: 36px; }
        .section-title {
          font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
          color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px;
        }

        /* Stat grid */
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stat-card { background: #f9fafb; border-radius: 8px; padding: 14px 16px; border: 1px solid #e5e7eb; }
        .stat-value { font-size: 22px; font-weight: 700; color: #111827; }
        .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }

        /* SEIFA */
        .seifa-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .seifa-label { width: 140px; font-size: 13px; color: #374151; flex-shrink: 0; }
        .seifa-bar-wrap { flex: 1; background: #f3f4f6; border-radius: 4px; height: 10px; overflow: hidden; }
        .seifa-bar { height: 100%; border-radius: 4px; transition: width 0.4s; }
        .seifa-score { width: 36px; text-align: right; font-size: 13px; font-weight: 600; color: #111827; }

        /* Table */
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { text-align: left; padding: 8px 10px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
        .data-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table td:not(:first-child) { text-align: right; }
        .data-table th:not(:first-child) { text-align: right; }

        /* Age bars */
        .age-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 13px; }
        .age-label { width: 50px; color: #6b7280; flex-shrink: 0; }
        .age-bar-wrap { flex: 1; background: #f3f4f6; border-radius: 3px; height: 8px; overflow: hidden; }
        .age-bar { height: 100%; background: #2563eb; border-radius: 3px; }
        .age-val { width: 42px; text-align: right; color: #374151; }

        /* Comparison cards */
        .comparison-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .suburb-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .suburb-card.primary { border-color: #2563eb; }
        .suburb-card-header { padding: 12px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
        .suburb-card.primary .suburb-card-header { background: #eff6ff; border-color: #bfdbfe; }
        .suburb-name { font-size: 14px; font-weight: 600; color: #111827; flex: 1; }
        .suburb-meta { font-size: 11px; color: #9ca3af; }
        .primary-badge { font-size: 10px; font-weight: 600; background: #2563eb; color: white; padding: 1px 6px; border-radius: 4px; }
        .suburb-card-stats { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
        .suburb-card-stats > div { display: flex; justify-content: space-between; font-size: 12px; }
        .cs-label { color: #6b7280; }
        .cs-val { font-weight: 600; color: #111827; }

        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
      `}</style>

      {/* Action bar — hidden when printing */}
      <div className="action-bar no-print">
        <span className="action-bar-title">{p.suburb} — ABS Data Report</span>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
        <a
          className="btn btn-primary"
          href={`${API_URL}/api/report/${reportId}/download`}
          download
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Save PDF
        </a>
      </div>

      <div className="report-page">
        {/* Cover */}
        <div className="cover-header">
          <div className="report-badge">
            {data.plan === "single" ? "Single Report" : data.plan === "professional" ? "Professional Report" : "Enterprise Report"}
            {" · "}ABS Census {p.censusYear}
          </div>
          <h1 className="cover-title">{p.suburb}</h1>
          <div className="cover-meta">
            {p.state}{p.lga ? ` · ${p.lga}` : ""}{p.postcode ? ` · Postcode ${p.postcode}` : ""}
            {" · "}SA2 {p.sa2Code}
            {" · "}Generated {new Date(data.generatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Key stats */}
        <div className="section">
          <div className="section-title">Snapshot</div>
          <div className="stat-grid">
            <StatCard label="Total Population" value={fmt(d.totalPopulation)} />
            <StatCard label="Median Age" value={fmt(d.medianAge, "", " yrs")} />
            <StatCard label="Median HH Income" value={fmt(d.medianHouseholdIncome, "$", "/yr")} />
            <StatCard label="Median Rent" value={fmt(h.medianRentWeekly, "$", "/wk")} />
            <StatCard label="Median Mortgage" value={fmt(h.medianMortgageMonthly, "$", "/mo")} />
            <StatCard label="Owner Occupied" value={fmtPct(h.ownerOccupied)} />
          </div>
        </div>

        {/* SEIFA */}
        <div className="section">
          <div className="section-title">SEIFA Indices (Decile, 1 = most disadvantaged)</div>
          <SeifaBar label="IRSD — Relative Disadvantage" decile={s.irsdDecile} />
          <SeifaBar label="IRSAD — Advantage/Disadvantage" decile={s.irsadDecile} />
          <SeifaBar label="IER — Economic Resources" decile={s.ierDecile} />
          <SeifaBar label="IEO — Education/Occupation" decile={s.ieoDecile} />
        </div>

        {/* Demographics */}
        <div className="section">
          <div className="section-title">Demographics</div>
          <table className="data-table">
            <tbody>
              <tr><td>Median Personal Income</td><td>{fmt(d.medianPersonalIncome, "$", "/yr")}</td></tr>
              <tr><td>Born Overseas</td><td>{fmtPct(d.bornOverseas)}</td></tr>
              <tr><td>Speaks English Only</td><td>{fmtPct(d.speaksEnglishOnly)}</td></tr>
              <tr><td>Indigenous Population</td><td>{fmtPct(d.indigenousPopulation)}</td></tr>
              <tr><td>Families with Children</td><td>{fmtPct(d.familiesWithChildren)}</td></tr>
              <tr><td>Single Parent Families</td><td>{fmtPct(d.singleParentFamilies)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Housing */}
        <div className="section">
          <div className="section-title">Housing</div>
          <table className="data-table">
            <tbody>
              <tr><td>Median House Price</td><td>{fmt(h.medianHousePrice, "$")}</td></tr>
              <tr><td>Total Dwellings</td><td>{fmt(h.totalDwellings)}</td></tr>
              <tr><td>Owner Occupied</td><td>{fmtPct(h.ownerOccupied)}</td></tr>
              <tr><td>Renting</td><td>{fmtPct(h.renting)}</td></tr>
              <tr><td>Social Housing</td><td>{fmtPct(h.socialHousing)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Age distribution */}
        <div className="section">
          <div className="section-title">Age Distribution</div>
          {ageRows.map(([label, key]) => {
            const val = d.ageDistribution[key];
            return (
              <div key={key} className="age-row">
                <span className="age-label">{label}</span>
                <div className="age-bar-wrap">
                  <div className="age-bar" style={{ width: val != null ? `${Math.min(val * 3, 100)}%` : "0%" }} />
                </div>
                <span className="age-val">{fmtPct(val)}</span>
              </div>
            );
          })}
        </div>

        {/* Top languages */}
        {d.topLanguages.length > 0 && (
          <div className="section">
            <div className="section-title">Top Languages at Home (other than English)</div>
            <table className="data-table">
              <thead>
                <tr><th>Language</th><th>Speakers</th><th>Share</th></tr>
              </thead>
              <tbody>
                {d.topLanguages.slice(0, 8).map((l) => (
                  <tr key={l.language}>
                    <td>{l.language}</td>
                    <td>{l.count.toLocaleString()}</td>
                    <td>{l.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Comparison (Professional / Enterprise) */}
        {isPro && data.neighbours.length > 0 && (
          <div className="section page-break">
            <div className="section-title">Suburb Comparison</div>
            <div className="comparison-grid">
              <SuburbCard data={p} isPrimary />
              {data.neighbours.map((n) => (
                <SuburbCard key={n.sa2Code} data={n} isPrimary={false} />
              ))}
            </div>

            {/* Comparison table */}
            <div style={{ marginTop: 24 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>{p.suburb}</th>
                    {data.neighbours.map((n) => <th key={n.sa2Code}>{n.suburb}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Population", (r: SuburbResponse) => fmt(r.demographics.totalPopulation)],
                    ["Median Age", (r: SuburbResponse) => fmt(r.demographics.medianAge, "", " yrs")],
                    ["HH Income", (r: SuburbResponse) => fmt(r.demographics.medianHouseholdIncome, "$")],
                    ["Median Rent /wk", (r: SuburbResponse) => fmt(r.housing.medianRentWeekly, "$")],
                    ["Mortgage /mo", (r: SuburbResponse) => fmt(r.housing.medianMortgageMonthly, "$")],
                    ["Owner Occ.", (r: SuburbResponse) => fmtPct(r.housing.ownerOccupied)],
                    ["IRSD Decile", (r: SuburbResponse) => decileLabel(r.seifa.irsdDecile)],
                    ["IEO Decile", (r: SuburbResponse) => decileLabel(r.seifa.ieoDecile)],
                  ].map(([label, fn]) => (
                    <tr key={label as string}>
                      <td>{label as string}</td>
                      <td>{(fn as (r: SuburbResponse) => string)(p)}</td>
                      {data.neighbours.map((n) => <td key={n.sa2Code}>{(fn as (r: SuburbResponse) => string)(n)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="footer">
          Data sourced from Australian Bureau of Statistics Census {p.censusYear} · Generated by WorksWell DemoReport
        </div>
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
    fetchReportData(reportId).then((d) => {
      if (d) setData(d);
      else setError(true);
    });
  }, [reportId]);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Report not found or not ready yet.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={{ width: 32, height: 32, border: "3px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
