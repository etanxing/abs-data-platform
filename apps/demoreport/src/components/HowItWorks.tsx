const STEPS = [
  {
    num: "01",
    title: "Enter suburb or postcode",
    desc: "Type any NSW or VIC suburb name or 4-digit postcode into the search bar. We instantly match it to the ABS SA2 geography.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Preview key demographic data",
    desc: "See a free snapshot: total population, median household income, SEIFA disadvantage decile, and age distribution chart.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Download the full PDF report",
    desc: "Pay once for a professionally formatted 10-page PDF with all 7 data sections, state comparisons, and ABS source citations.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide mb-3">Simple process</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How it works</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            From search to report in under two minutes. No login required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-brand-100" />

          {STEPS.map((step) => (
            <div key={step.num} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-brand-600 mb-5">
                {step.icon}
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {step.num.slice(-1)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
