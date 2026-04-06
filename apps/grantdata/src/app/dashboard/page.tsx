"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { SuburbData, SavedRegion } from "@/lib/types";
import { searchSuburb, searchPostcode, getSavedRegions, saveRegion, deleteSavedRegion, getMe } from "@/lib/api";
import { isLoggedIn, clearToken } from "@/lib/auth";

const AgeBarChart = dynamic(() => import("@/components/dashboard/AgeBarChart"), { ssr: false });
const HousingPieChart = dynamic(() => import("@/components/dashboard/HousingPieChart"), { ssr: false });

const TABS = ["Overview", "SEIFA", "Demographics", "Housing", "Language"] as const;
type Tab = typeof TABS[number];

function fmt(v: number | null | undefined, prefix = "", suffix = ""): string {
  if (v == null) return "—";
  return `${prefix}${v.toLocaleString()}${suffix}`;
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function decileColor(d: number | null): string {
  if (d == null) return "bg-gray-100 text-gray-500";
  if (d <= 3) return "bg-red-100 text-red-700";
  if (d <= 5) return "bg-orange-100 text-orange-700";
  if (d <= 7) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function buildGrantText(d: SuburbData): string {
  const dem = d.demographics;
  const s = d.seifa;
  const h = d.housing;
  const censusYear = d.censusYear;

  const lines = [
    `According to the ${censusYear} ABS Census of Population and Housing, ${d.suburb} (SA2 code: ${d.sa2Code}, postcode: ${d.postcode ?? "n/a"}) had a total population of ${fmt(dem.totalPopulation)} residents.`,
    "",
    `The area has a SEIFA Index of Relative Socio-Economic Disadvantage (IRSD) score of ${fmt(s.irsd)}, placing it in the ${s.irsdDecile != null ? `${s.irsdDecile}${ordinal(s.irsdDecile)}` : "—"} decile nationally. ${s.irsdDecile != null && s.irsdDecile <= 3 ? "This indicates significant relative disadvantage compared to other Australian areas." : s.irsdDecile != null && s.irsdDecile <= 5 ? "This indicates below-average socio-economic conditions relative to the national average." : ""}`,
    "",
    `Key demographic indicators include: median household income of ${fmt(dem.medianHouseholdIncome, "$")} per year (national median: $91,000), ${pct(dem.singleParentFamilies)} single-parent families, ${pct(dem.indigenousPopulation)} Aboriginal and/or Torres Strait Islander residents, and ${pct(dem.bornOverseas)} residents born overseas.`,
    "",
    `Housing characteristics: ${pct(h.renting)} of households are renters with a median weekly rent of ${fmt(h.medianRentWeekly, "$")}. Social housing accounts for ${pct(h.socialHousing)} of total dwellings.`,
    "",
    `Source: Australian Bureau of Statistics, ${censusYear} Census of Population and Housing, and SEIFA ${censusYear}. Data accessed via GrantData (abs-data-platform).`,
  ];

  return lines.join("\n");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

function DashboardContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuburbData[]>([]);
  const [selected, setSelected] = useState<SuburbData | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedRegions, setSavedRegions] = useState<SavedRegion[]>([]);
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    getMe().then((u) => setUserName(u.name)).catch(() => {});
    getSavedRegions().then(setSavedRegions).catch(() => {});
  }, [router]);

  // Handle URL params on mount
  useEffect(() => {
    const suburb = params.get("suburb");
    const postcode = params.get("postcode");
    if (suburb) {
      setQuery(suburb);
      doSearch(suburb, false);
    } else if (postcode) {
      setQuery(postcode);
      doSearch(postcode, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = useCallback(async (q: string, byPostcode: boolean) => {
    setError("");
    setLoading(true);
    setResults([]);
    setSelected(null);
    try {
      const data = byPostcode ? await searchPostcode(q) : await searchSuburb(q);
      setResults(data);
      if (data.length === 1) setSelected(data[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      if (msg === "Unauthorized" || msg === "Invalid or expired token") {
        clearToken();
        router.replace("/login");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    const isPostcode = /^\d{4}$/.test(q);
    doSearch(q, isPostcode);
  }

  async function handleSave() {
    if (!selected) return;
    try {
      await saveRegion({
        sa2Code: selected.sa2Code,
        suburb: selected.suburb,
        postcode: selected.postcode,
        state: selected.state,
      });
      const updated = await getSavedRegions();
      setSavedRegions(updated);
    } catch {}
  }

  async function handleUnsave(sa2Code: string) {
    try {
      await deleteSavedRegion(sa2Code);
      setSavedRegions((prev) => prev.filter((r) => r.sa2_code !== sa2Code));
    } catch {}
  }

  function handleCopyToGrant() {
    if (!selected) return;
    const text = buildGrantText(selected);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleSignOut() {
    clearToken();
    router.push("/");
  }

  const isSaved = selected ? savedRegions.some((r) => r.sa2_code === selected.sa2Code) : false;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <span className="text-lg font-bold text-brand-700">GrantData</span>
          {userName && <p className="text-xs text-gray-500 mt-0.5">{userName}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Saved Regions</p>
          {savedRegions.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No saved regions yet.</p>
          ) : (
            <ul className="space-y-1">
              {savedRegions.map((r) => (
                <li key={r.sa2_code} className="group flex items-center justify-between">
                  <button
                    className="flex-1 text-left text-sm text-gray-700 hover:text-brand-700 px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-colors truncate"
                    onClick={() => {
                      setQuery(r.suburb);
                      doSearch(r.suburb, false);
                    }}
                  >
                    <span className="font-medium">{r.suburb}</span>
                    {r.postcode && <span className="text-gray-400 ml-1">{r.postcode}</span>}
                  </button>
                  <button
                    onClick={() => handleUnsave(r.sa2_code)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 transition-opacity"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-1">
          <a href="/dashboard/billing" className="block text-sm text-gray-600 hover:text-brand-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Billing
          </a>
          <button
            onClick={handleSignOut}
            className="w-full text-left text-sm text-gray-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search suburb or postcode (e.g. Fitzroy or 3065)"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {/* Multiple results selector */}
          {results.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {results.map((r) => (
                <button
                  key={r.sa2Code}
                  onClick={() => setSelected(r)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selected?.sa2Code === r.sa2Code
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
                  }`}
                >
                  {r.suburb} {r.postcode && `(${r.postcode})`}
                </button>
              ))}
            </div>
          )}
        </header>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-lg font-medium text-gray-500">Search for a postcode or suburb</p>
              <p className="text-sm mt-1">Enter a 4-digit postcode or suburb name above to get started</p>
            </div>
          )}

          {selected && (
            <>
              {/* Header row */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selected.suburb}</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {[selected.state, selected.postcode, selected.lga].filter(Boolean).join(" · ")} &nbsp;·&nbsp; SA2: {selected.sa2Code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyToGrant}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied ? "bg-green-600 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {copied ? "✓ Copied!" : "📋 Copy to Grant"}
                  </button>
                  <button
                    onClick={isSaved ? () => handleUnsave(selected.sa2Code) : handleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isSaved
                        ? "border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600"
                        : "border-brand-300 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    {isSaved ? "★ Saved" : "☆ Save Region"}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-gray-200">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      tab === t
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {tab === "Overview" && <OverviewTab d={selected} />}
              {tab === "SEIFA" && <SeifaTab d={selected} />}
              {tab === "Demographics" && <DemographicsTab d={selected} AgeChart={AgeBarChart} />}
              {tab === "Housing" && <HousingTab d={selected} HousingChart={HousingPieChart} />}
              {tab === "Language" && <LanguageTab d={selected} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Tab components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function OverviewTab({ d }: { d: SuburbData }) {
  const dem = d.demographics;
  const s = d.seifa;
  const h = d.housing;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Population" value={fmt(dem.totalPopulation)} sub={`Census ${d.censusYear}`} />
        <StatCard label="Median Age" value={fmt(dem.medianAge, "", " yrs")} />
        <StatCard label="Median Household Income" value={fmt(dem.medianHouseholdIncome, "$", "/yr")} />
        <StatCard label="IRSD Decile" value={s.irsdDecile != null ? `${s.irsdDecile}/10` : "—"} sub="Disadvantage (lower = more)" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Renting" value={pct(h.renting)} />
        <StatCard label="Born Overseas" value={pct(dem.bornOverseas)} />
        <StatCard label="Indigenous" value={pct(dem.indigenousPopulation)} />
        <StatCard label="Single Parent Families" value={pct(dem.singleParentFamilies)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Data sources</p>
        <p className="text-sm text-gray-600">
          2021 ABS Census of Population and Housing · SEIFA 2021 · ASGS Edition 3 (2021)
        </p>
      </div>
    </div>
  );
}

function SeifaTab({ d }: { d: SuburbData }) {
  const s = d.seifa;
  const indices = [
    { key: "IRSD", name: "Index of Relative Socio-Economic Disadvantage", score: s.irsd, decile: s.irsdDecile, desc: "Measures disadvantage — lower decile = more disadvantaged" },
    { key: "IRSAD", name: "Index of Relative Socio-Economic Advantage and Disadvantage", score: s.irsad, decile: s.irsadDecile, desc: "Measures both advantage and disadvantage" },
    { key: "IER", name: "Index of Economic Resources", score: s.ier, decile: s.ierDecile, desc: "Measures household income and wealth" },
    { key: "IEO", name: "Index of Education and Occupation", score: s.ieo, decile: s.ieoDecile, desc: "Measures education and skilled employment" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {indices.map((idx) => (
        <div key={idx.key} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-sm font-bold text-gray-900">{idx.key}</span>
              <p className="text-xs text-gray-500 mt-0.5 max-w-[200px]">{idx.name}</p>
            </div>
            <div className={`text-xl font-bold px-3 py-1 rounded-lg ${decileColor(idx.decile)}`}>
              {idx.decile != null ? `D${idx.decile}` : "—"}
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-400">Score</p>
              <p className="text-xl font-bold text-gray-900">{fmt(idx.score)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">National Decile</p>
              <p className="text-xl font-bold text-gray-900">{idx.decile ?? "—"} / 10</p>
            </div>
          </div>
          {idx.decile != null && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all"
                style={{ width: `${idx.decile * 10}%` }}
              />
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">{idx.desc}</p>
        </div>
      ))}
    </div>
  );
}

function DemographicsTab({ d, AgeChart }: { d: SuburbData; AgeChart: React.ComponentType<{ data: SuburbData }> }) {
  const dem = d.demographics;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Population" value={fmt(dem.totalPopulation)} sub={`Census ${d.censusYear}`} />
        <StatCard label="Median Age" value={fmt(dem.medianAge, "", " yrs")} />
        <StatCard label="Median Household Income" value={fmt(dem.medianHouseholdIncome, "$", "/yr")} />
        <StatCard label="Median Personal Income" value={fmt(dem.medianPersonalIncome, "$", "/yr")} />
        <StatCard label="Families with Children" value={pct(dem.familiesWithChildren)} />
        <StatCard label="Single Parent Families" value={pct(dem.singleParentFamilies)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Age Distribution</p>
        <AgeChart data={d} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Born Overseas" value={pct(dem.bornOverseas)} />
        <StatCard label="Speaks English Only" value={pct(dem.speaksEnglishOnly)} />
        <StatCard label="Indigenous" value={pct(dem.indigenousPopulation)} />
      </div>
    </div>
  );
}

function HousingTab({ d, HousingChart }: { d: SuburbData; HousingChart: React.ComponentType<{ data: SuburbData }> }) {
  const h = d.housing;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Dwellings" value={fmt(h.totalDwellings)} />
        <StatCard label="Median Weekly Rent" value={fmt(h.medianRentWeekly, "$", "/wk")} />
        <StatCard label="Median Monthly Mortgage" value={fmt(h.medianMortgageMonthly, "$", "/mo")} />
        <StatCard label="Owner Occupied" value={pct(h.ownerOccupied)} />
        <StatCard label="Renting" value={pct(h.renting)} />
        <StatCard label="Social Housing" value={pct(h.socialHousing)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Housing Tenure</p>
        <HousingChart data={d} />
      </div>
    </div>
  );
}

function LanguageTab({ d }: { d: SuburbData }) {
  const dem = d.demographics;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Born Overseas" value={pct(dem.bornOverseas)} />
        <StatCard label="Speaks English Only" value={pct(dem.speaksEnglishOnly)} />
        <StatCard label="Indigenous" value={pct(dem.indigenousPopulation)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Top Languages Spoken at Home</p>
        {dem.topLanguages.length === 0 ? (
          <p className="text-sm text-gray-400">No language data available</p>
        ) : (
          <div className="space-y-3">
            {dem.topLanguages.slice(0, 10).map((lang) => (
              <div key={lang.language} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-700 truncate">{lang.language}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-brand-500 h-2 rounded-full"
                    style={{ width: `${Math.min(lang.pct, 100)}%` }}
                  />
                </div>
                <div className="text-sm text-gray-500 w-16 text-right">{lang.pct.toFixed(1)}%</div>
                <div className="text-xs text-gray-400 w-20 text-right">{lang.count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
