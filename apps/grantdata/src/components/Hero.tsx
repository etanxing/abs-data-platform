"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Hero() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    const isPostcode = /^\d{4}$/.test(q);
    router.push(`/dashboard?${isPostcode ? "postcode" : "suburb"}=${encodeURIComponent(q)}`);
  }

  return (
    <section className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 pt-32 pb-24 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm px-4 py-1.5 rounded-full mb-6 font-medium">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          2021 ABS Census Data — Updated SEIFA 2021
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Community Needs Data<br />
          <span className="text-brand-200">for Grant Applications</span>
        </h1>

        <p className="text-xl text-brand-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop spending hours on ABS TableBuilder. Get SEIFA scores, population profiles,
          and disadvantage indicators for any Australian postcode in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-8">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter a postcode or region (e.g. 3000 or Fitzroy)"
              className="w-full pl-10 pr-4 py-3.5 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 shadow-lg"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3.5 bg-white text-brand-700 font-semibold rounded-lg hover:bg-brand-50 transition-colors shadow-lg whitespace-nowrap"
          >
            Search Free
          </button>
        </div>

        <p className="text-brand-200 text-sm">
          No credit card required &middot; Free to search &middot;{" "}
          <Link href="/register" className="text-white underline underline-offset-2 hover:no-underline">
            Start free trial
          </Link>
        </p>

        {/* Social proof */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {[
            { value: "2,400+", label: "SA2 regions covered" },
            { value: "6", label: "ABS datasets integrated" },
            { value: "< 1s", label: "Average query time" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-brand-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
