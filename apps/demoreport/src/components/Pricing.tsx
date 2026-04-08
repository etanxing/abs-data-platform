"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createCheckoutSession, type ReportPlan } from "@/lib/api";

const PLANS: {
  name: string; plan: ReportPlan; price: number; pages: number;
  description: string; features: string[]; cta: string; featured: boolean;
}[] = [
  {
    name: "Single Report",
    plan: "single",
    price: 99,
    pages: 10,
    description: "One-off report for a single suburb or postcode.",
    features: [
      "All 7 data sections",
      "10-page professionally formatted PDF",
      "ABS source citations",
      "Instant download after payment",
      "National coverage (all states & territories)",
    ],
    cta: "Buy Single Report",
    featured: false,
  },
  {
    name: "Professional",
    plan: "professional",
    price: 199,
    pages: 11,
    description: "Compare your target suburb with up to 2 neighbouring areas.",
    features: [
      "Everything in Single",
      "Side-by-side neighbour comparison page",
      "13 indicators compared across suburbs",
      "Side-by-side SEIFA decile analysis",
      "1 week unlimited re-downloads",
    ],
    cta: "Buy Professional",
    featured: true,
  },
  {
    name: "Enterprise",
    plan: "enterprise",
    price: 299,
    pages: 12,
    description: "Full analysis package with AI-generated narrative commentary.",
    features: [
      "Everything in Professional",
      "Up to 4 suburb comparison",
      "AI-generated 5-section executive narrative",
      "Risk & opportunity flag summary",
      "Priority email support",
    ],
    cta: "Buy Enterprise",
    featured: false,
  },
];

function PricingInner({ suburb, sa2Code }: { suburb?: string; sa2Code?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<ReportPlan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const activeSuburb = suburb ?? searchParams.get("suburb") ?? "";
  const activeSa2    = sa2Code ?? searchParams.get("sa2Code") ?? "";

  async function handleBuy(plan: ReportPlan) {
    if (!activeSuburb) {
      // No suburb context — send to search first
      router.push(`/report?plan=${plan}`);
      return;
    }
    setLoading(plan);
    setCheckoutError(null);
    const url = await createCheckoutSession(activeSuburb, activeSa2, plan);
    if (url) {
      window.location.href = url;
    } else {
      setLoading(null);
      setCheckoutError("Could not start checkout — please try again or contact support.");
    }
  }

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
            {activeSuburb && (
              <span className="block mt-2 text-brand-600 font-medium">
                Report for: {activeSuburb}
              </span>
            )}
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
                <div className="flex items-center justify-between mb-1">
                  <h3 className={["font-bold text-lg", plan.featured ? "text-white" : "text-gray-900"].join(" ")}>
                    {plan.name}
                  </h3>
                  <span className={["text-xs font-medium px-2 py-0.5 rounded-full", plan.featured ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"].join(" ")}>
                    {plan.pages} pages
                  </span>
                </div>
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
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={plan.featured ? "text-blue-50" : "text-gray-600"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(plan.plan)}
                disabled={loading !== null}
                className={[
                  "block w-full text-center px-5 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60",
                  plan.featured
                    ? "bg-white text-brand-700 hover:bg-blue-50"
                    : "bg-brand-600 text-white hover:bg-brand-700",
                ].join(" ")}
              >
                {loading === plan.plan ? "Redirecting to Stripe…" : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {checkoutError && (
          <div className="flex items-center justify-center gap-2 mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 max-w-md mx-auto">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {checkoutError}
          </div>
        )}
        <p className="text-center text-xs text-gray-400 mt-8">
          Prices in AUD. Secure payment via Stripe. Instant PDF download.
        </p>
      </div>
    </section>
  );
}

export function Pricing({ suburb, sa2Code }: { suburb?: string; sa2Code?: string }) {
  return (
    <Suspense fallback={<div className="py-20" />}>
      <PricingInner suburb={suburb} sa2Code={sa2Code} />
    </Suspense>
  );
}
