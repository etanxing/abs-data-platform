"use client";

import { useState } from "react";

export default function HomePage() {
  const [query, setQuery] = useState("");

  function handleSearch() {
    if (!query.trim()) return;
    // TODO: Navigate to results page
    console.log("Searching for:", query);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <span className="inline-block bg-brand-50 text-brand-700 text-sm font-semibold px-3 py-1 rounded-full mb-4">
            ABS Data for Community Organisations
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GrantData
          </h1>
          <p className="text-xl text-gray-500">
            Community Needs Data for Grant Applications
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search postcode or region (e.g. 3000 or Greater Melbourne)"
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
          >
            Search
          </button>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-left">
          {[
            { title: "Disadvantage Indices", desc: "SEIFA scores showing relative socio-economic disadvantage" },
            { title: "Vulnerable Populations", desc: "Elderly, youth, single-parent families, indigenous communities" },
            { title: "Export for Grants", desc: "Download data tables ready for grant application templates" },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
