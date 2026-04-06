"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchSuburb, fetchPostcode, createCheckoutSession } from "@/lib/api";
import type { SuburbResponse } from "@/lib/types";
import { DataCard } from "@/components/report/DataCard";
import { LockedSection } from "@/components/report/LockedSection";
import { Nav } from "@/components/Nav";

// Charts are client-only (recharts uses browser APIs)
const AgeChart = dynamic(() => import("@/components/report/AgeChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] bg-gray-50 animate-pulse rounded-lg" />,
});
const HousingChart = dynamic(() => import("@/components/report/HousingChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] bg-gray-50 animate-pulse rounded-lg" />,
});

function fmt(n: number | null, prefix = "", suffix = ""): string | null {
  if (n == null) return null;
  return `${prefix}${n.toLocaleString()}${suffix}`;
}

function seifaLabel(decile: number | null): string {
  if (decile == null) return "—";
  if (decile <= 2) return `Decile ${decile} — High disadvantage`;
  if (decile <= 4) return `Decile ${decile} — Above-average disadvantage`;
  if (decile <= 6) return `Decile ${decile} — Average`;
  if (decile <= 8) return `Decile ${decile} — Below-average disadvantage`;
  return `Decile ${decile} — Low disadvantage`;
}

export default function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const suburb = searchParams.get("suburb") ?? "";
  const postcode = searchParams.get("postcode") ?? "";
  const query = suburb || postcode;

  const [results, setResults] = useState<SuburbResponse[] | null>(null);
  const [selected, setSelected] = useState<SuburbResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const fetch = postcode ? fetchPostcode(postcode) : fetchSuburb(suburb);
    fetch.then((data) => {
      setResults(data);
      if (data && data.length > 0) setSelected(data[0]);
      else setError("No data found for this suburb or postcode.");
    }).catch(() => {
      setError("Could not connect to the data API. Is wrangler dev running?");
    }).finally(() => setLoading(false));
  }, [suburb, postcode, query]);

  async function handleUnlock() {
    if (!selected) return;
    setCheckoutLoading(true);
    const url = await createCheckoutSession(selected.suburb, selected.sa2Code);
    if (url) {
      window.location.href = url;
    } else {
      alert("Could not start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  }

  // ── Empty state
  if (!query) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-gray-500 mb-4">No suburb or postcode specified.</p>
            <Link href="/" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
              ← Back to search
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Loading
  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Fetching ABS data…</p>
          </div>
        </div>
      </>
    );
  }

  // ── Error
  if (error || !selected) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-2xl mb-2">🔍</p>
            <h2 className="font-semibold text-gray-900 mb-2">No results found</h2>
            <p className="text-sm text-gray-500 mb-6">{error ?? `No data for "${query}".`}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
              ← Try another search
            </button>
          </div>
        </div>
      </>
    );
  }

  const d = selected;

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50">
        {/* Header bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Search</Link>
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {d.suburb}
                <span className="text-gray-400 font-normal ml-2 text-sm">{d.state}</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                SA2 {d.sa2Code}{d.postcode ? ` · Postcode ${d.postcode}` : ""}{d.lga ? ` · ${d.lga}` : ""} · Census {d.censusYear}
              </p>
            </div>
            {/* Multiple results selector */}
            {results && results.length > 1 && (
              <select
                value={d.sa2Code}
                onChange={(e) => setSelected(results.find((r) => r.sa2Code === e.target.value) ?? d)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {results.map((r) => (
                  <option key={r.sa2Code} value={r.sa2Code}>{r.suburb} ({r.state})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* ── Free preview: key headlines */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DataCard
              label="Population"
              value={fmt(d.demographics.totalPopulation)}
              sub="Usual residents (2021)"
              accent
            />
            <DataCard
              label="Median Household Income"
              value={fmt(d.demographics.medianHouseholdIncome, "$", "/wk")}
              sub="Weekly household income"
            />
            <DataCard
              label="Median Age"
              value={d.demographics.medianAge != null ? `${d.demographics.medianAge} yrs` : null}
              sub="All persons"
            />
            <DataCard
              label="SEIFA (IRSD)"
              value={seifaLabel(d.seifa.irsdDecile)}
              sub="Relative disadvantage"
            />
          </div>

          {/* ── Free preview: age chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Age Distribution</h3>
            <p className="text-xs text-gray-400 mb-4">% of usual resident population by age group · ABS Census 2021</p>
            <AgeChart data={d.demographics.ageDistribution} />
          </div>

          {/* ── Locked: Housing tenure */}
          <LockedSection
            title="Housing Tenure Breakdown"
            onUnlock={handleUnlock}
            loading={checkoutLoading}
          >
            <HousingChart housing={d.housing} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>Median rent: {fmt(d.housing.medianRentWeekly, "$", "/wk") ?? "—"}</div>
              <div>Median mortgage: {fmt(d.housing.medianMortgageMonthly, "$", "/mo") ?? "—"}</div>
              <div>Total dwellings: {fmt(d.housing.totalDwellings) ?? "—"}</div>
              <div>Owner-occupied: {d.housing.ownerOccupied != null ? `${(d.housing.ownerOccupied * 100).toFixed(0)}%` : "—"}</div>
            </div>
          </LockedSection>

          {/* ── Locked: Full SEIFA */}
          <LockedSection
            title="SEIFA Analysis — All 4 Indices"
            onUnlock={handleUnlock}
            loading={checkoutLoading}
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "IRSD (Disadvantage)", score: d.seifa.irsd, decile: d.seifa.irsdDecile },
                { label: "IRSAD (Adv. & Dis.)", score: d.seifa.irsad, decile: d.seifa.irsadDecile },
                { label: "IER (Econ. Resources)", score: d.seifa.ier, decile: d.seifa.ierDecile },
                { label: "IEO (Edu. & Occ.)", score: d.seifa.ieo, decile: d.seifa.ieoDecile },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="font-bold text-gray-900">{item.score ?? "—"}</p>
                  <p className="text-xs text-brand-600">Decile {item.decile ?? "—"}</p>
                </div>
              ))}
            </div>
          </LockedSection>

          {/* ── Locked: Language diversity */}
          <LockedSection
            title="Language & Cultural Diversity"
            onUnlock={handleUnlock}
            loading={checkoutLoading}
          >
            <div className="space-y-2">
              {d.demographics.topLanguages.slice(0, 5).map((l) => (
                <div key={l.language} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">{l.language}</div>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(l.pct * 100).toFixed(0)}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 w-10 text-right">{(l.pct * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </LockedSection>

          {/* Unlock CTA */}
          <div className="bg-brand-600 rounded-2xl p-6 text-center text-white">
            <h3 className="font-bold text-lg mb-2">Unlock the Full PDF Report</h3>
            <p className="text-blue-100 text-sm mb-5 max-w-md mx-auto">
              10-page professionally formatted report with all data sections,
              state comparisons, and ABS source citations. One-time payment.
            </p>
            <button
              onClick={handleUnlock}
              disabled={checkoutLoading}
              className="px-8 py-3 bg-white text-brand-700 font-bold rounded-xl hover:bg-blue-50 disabled:opacity-50 transition-colors shadow-lg"
            >
              {checkoutLoading ? "Redirecting to Stripe…" : "Get Full Report — $99"}
            </button>
            <p className="text-xs text-blue-200 mt-3">Secure payment via Stripe · Instant PDF download</p>
          </div>
        </div>
      </div>
    </>
  );
}
