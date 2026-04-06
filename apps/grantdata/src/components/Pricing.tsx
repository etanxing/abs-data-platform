"use client";

import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For occasional grant writers and small community organisations.",
    lookups: "50 lookups / month",
    features: [
      "50 region lookups per month",
      "All SEIFA indices & deciles",
      "Population & housing data",
      "Language diversity data",
      "Copy-to-grant text output",
      "Save up to 10 regions",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "$59",
    period: "/month",
    description: "For grant managers with multiple active applications.",
    lookups: "Unlimited lookups",
    features: [
      "Unlimited region lookups",
      "All Starter features",
      "Unlimited saved regions",
      "CSV data export",
      "Email support",
      "API access (coming soon)",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Team",
    price: "$99",
    period: "/month",
    description: "For grant teams and social service agencies.",
    lookups: "5 users, unlimited lookups",
    features: [
      "5 team member seats",
      "Unlimited lookups & regions",
      "All Professional features",
      "Shared saved regions",
      "Priority support",
      "Custom data exports",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full mb-3">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            7-day free trial on all plans. No credit card required to start.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col ${
                plan.featured
                  ? "bg-brand-700 text-white shadow-2xl ring-2 ring-brand-500 scale-105"
                  : "bg-white shadow-sm border border-gray-200"
              }`}
            >
              {plan.featured && (
                <div className="text-center mb-4">
                  <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-bold mb-1 ${plan.featured ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.featured ? "text-brand-200" : "text-gray-500"}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.featured ? "text-white" : "text-gray-900"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.featured ? "text-brand-200" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm font-medium mt-2 ${plan.featured ? "text-brand-200" : "text-brand-600"}`}>
                  {plan.lookups}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.featured ? "text-brand-300" : "text-brand-600"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.featured ? "text-brand-100" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                  plan.featured
                    ? "bg-white text-brand-700 hover:bg-brand-50"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          All prices in AUD. Cancel anytime. GST may apply.
        </p>
      </div>
    </section>
  );
}
