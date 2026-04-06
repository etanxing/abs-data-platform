const FEATURES = [
  {
    title: "Population & Demographics",
    desc: "Total population count, household size, family composition, and born-overseas percentage from ABS Census 2021.",
    icon: "👥",
  },
  {
    title: "Age Distribution",
    desc: "Full breakdown by 10-year cohorts (0–4 through 75+) visualised as a bar chart — critical for retirement village and childcare feasibility.",
    icon: "📊",
  },
  {
    title: "Income & Employment",
    desc: "Median weekly household and personal income. Benchmark against state and national averages to gauge affordability.",
    icon: "💰",
  },
  {
    title: "Housing Stock & Tenure",
    desc: "Owner-occupied vs renting vs social housing split, median weekly rent, median monthly mortgage repayments, total dwelling count.",
    icon: "🏠",
  },
  {
    title: "SEIFA Disadvantage Scores",
    desc: "All four SEIFA 2021 indices (IRSD, IRSAD, IER, IEO) with national decile rankings and plain-English interpretation.",
    icon: "📐",
  },
  {
    title: "Language & Cultural Diversity",
    desc: "Top 10 languages spoken at home. Speaks-English-only percentage. Essential for community consultation planning.",
    icon: "🌏",
  },
];

export function WhatIncluded() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide mb-3">Full report contents</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">What's included</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Every report is a structured, 10-page PDF covering all the data
            planners, architects, and developers need to support a DA submission.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-brand-200 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-brand-50 border border-brand-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="text-brand-600 text-2xl flex-shrink-0">📎</div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-brand-900 text-sm">
              Data source: ABS Census 2021 &amp; SEIFA 2021
            </p>
            <p className="text-xs text-brand-700 mt-0.5">
              All data is sourced from the Australian Bureau of Statistics and cited in the report appendix.
              NSW and Victoria coverage. More states coming soon.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
