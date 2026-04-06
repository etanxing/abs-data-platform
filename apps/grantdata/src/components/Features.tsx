const FEATURES = [
  {
    icon: "📊",
    title: "SEIFA Scores & Deciles",
    desc: "Instantly access all four SEIFA 2021 indices — IRSD, IRSAD, IER, IEO — with national decile rankings that grant assessors require.",
  },
  {
    icon: "👥",
    title: "Population Profiles",
    desc: "Total population, age distribution, median incomes, and household composition from the 2021 ABS Census.",
  },
  {
    icon: "⚠️",
    title: "Disadvantage Indicators",
    desc: "Single-parent families, indigenous population percentages, social housing rates, and other vulnerability markers.",
  },
  {
    icon: "🌏",
    title: "Language & Cultural Diversity",
    desc: "Top spoken languages, percentage born overseas, and English proficiency data for multicultural grant applications.",
  },
  {
    icon: "📋",
    title: '"Copy to Grant" Output',
    desc: 'One-click formatted paragraphs ready to paste into grant applications, complete with ABS citations and data year.',
  },
  {
    icon: "📌",
    title: "Save Regions",
    desc: "Pin frequently used postcodes and regions to your sidebar for instant access across multiple grant applications.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full mb-3">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything your grant application needs
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Built specifically for community organisations, social service providers,
            and grant writers who work with ABS data daily.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:bg-brand-50 transition-colors group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">
                {f.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ABS attribution */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0 text-2xl">🏛️</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Powered by official ABS data</p>
            <p className="text-sm text-gray-500 mt-0.5">
              All data is sourced directly from the Australian Bureau of Statistics: 2021 Census of Population and Housing,
              SEIFA 2021, and the Australian Statistical Geography Standard (ASGS). Data is refreshed with each ABS release cycle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
