"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    const isPostcode = /^\d{4}$/.test(q);
    router.push(`/report?${isPostcode ? "postcode" : "suburb"}=${encodeURIComponent(q)}`);
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Powered by ABS Census 2021
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Demographic Feasibility Reports
          <br />
          <span className="text-blue-200">for Australian Property Developers</span>
        </h1>

        <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Get population, housing, and income data for any suburb in seconds.
          Used by developers to strengthen DA submissions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter a suburb or postcode..."
              className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3.5 bg-white text-brand-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap shadow-lg"
          >
            Get Report →
          </button>
        </div>

        <p className="text-xs text-blue-200 mt-4">
          Try: <button onClick={() => setQuery("Fitzroy")} className="underline hover:text-white">Fitzroy</button>
          {" · "}
          <button onClick={() => setQuery("Surry Hills")} className="underline hover:text-white">Surry Hills</button>
          {" · "}
          <button onClick={() => setQuery("3000")} className="underline hover:text-white">3000</button>
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-blue-100">
          {[
            { value: "2,200+", label: "NSW & VIC Suburbs" },
            { value: "2021", label: "ABS Census Data" },
            { value: "7 Indices", label: "SEIFA & Demographics" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-blue-200 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
