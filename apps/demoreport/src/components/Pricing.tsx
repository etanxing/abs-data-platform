const PLANS = [
  {
    name: "Single Report",
    price: 99,
    description: "One-off report for a single suburb or postcode.",
    features: [
      "All 7 data sections",
      "10-page professionally formatted PDF",
      "ABS source citations",
      "Instant download after payment",
      "NSW & VIC coverage",
    ],
    cta: "Buy Single Report",
    href: "#",
    featured: false,
  },
  {
    name: "Professional",
    price: 199,
    description: "Compare your target suburb with up to 2 neighbouring areas.",
    features: [
      "Everything in Single",
      "Neighbouring suburb comparison",
      "Comparative charts included",
      "Side-by-side SEIFA analysis",
      "1 week unlimited re-downloads",
    ],
    cta: "Buy Professional",
    href: "#",
    featured: true,
  },
  {
    name: "Enterprise",
    price: 299,
    description: "Full analysis package with AI-generated narrative commentary.",
    features: [
      "Everything in Professional",
      "Up to 4 suburb comparison",
      "AI-generated executive narrative",
      "Risk & opportunity summary",
      "Priority email support",
    ],
    cta: "Buy Enterprise",
    href: "#",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide mb-3">Simple pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Pay once, download instantly
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            No subscription. No login required. Reports are generated on demand
            from the latest ABS data.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                "rounded-2xl border p-8 relative flex flex-col",
                plan.featured
                  ? "border-brand-600 shadow-xl shadow-brand-100 bg-brand-600 text-white"
                  : "border-gray-200 bg-white",
              ].join(" ")}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className={["font-bold text-lg", plan.featured ? "text-white" : "text-gray-900"].join(" ")}>
                  {plan.name}
                </h3>
                <p className={["text-sm mt-1 mb-6", plan.featured ? "text-blue-100" : "text-gray-500"].join(" ")}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={["text-sm font-medium", plan.featured ? "text-blue-200" : "text-gray-500"].join(" ")}>AUD</span>
                  <span className={["text-4xl font-bold", plan.featured ? "text-white" : "text-gray-900"].join(" ")}>
                    ${plan.price}
                  </span>
                  <span className={["text-sm", plan.featured ? "text-blue-200" : "text-gray-400"].join(" ")}>/report</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg
                      className={["w-4 h-4 mt-0.5 flex-shrink-0", plan.featured ? "text-blue-200" : "text-brand-500"].join(" ")}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.featured ? "text-blue-50" : "text-gray-600"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={[
                  "block text-center px-5 py-3 rounded-xl font-semibold text-sm transition-colors",
                  plan.featured
                    ? "bg-white text-brand-700 hover:bg-blue-50"
                    : "bg-brand-600 text-white hover:bg-brand-700",
                ].join(" ")}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Prices in AUD incl. GST. Secure payment via Stripe. Instant PDF download.
        </p>
      </div>
    </section>
  );
}
