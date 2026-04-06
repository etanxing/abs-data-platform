"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, clearToken } from "@/lib/auth";
import { getSubscriptionStatus, createSubscriptionCheckout, createCustomerPortal } from "@/lib/api";
import type { SubscriptionStatus } from "@/lib/types";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$29/mo",
    lookups: "50 lookups / month",
    features: ["50 region lookups", "All SEIFA indices", "Copy-to-grant output", "Save 10 regions"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$59/mo",
    lookups: "Unlimited lookups",
    features: ["Unlimited lookups", "Unlimited saved regions", "CSV export", "Email support"],
    featured: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$99/mo",
    lookups: "5 users, unlimited",
    features: ["5 team seats", "Everything in Professional", "Shared regions", "Priority support"],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    getSubscriptionStatus()
      .then(setSub)
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load subscription";
        if (msg === "Unauthorized") { clearToken(); router.replace("/login"); return; }
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubscribe(plan: string) {
    setError("");
    setActionLoading(plan);
    try {
      const { url } = await createSubscriptionCheckout(plan);
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePortal() {
    setError("");
    setActionLoading("portal");
    try {
      const { url } = await createCustomerPortal();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal unavailable");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-brand-700 font-bold text-lg">GrantData</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 text-sm">Billing</span>
        </div>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-500 mb-8">Manage your GrantData plan and usage.</p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Current plan */}
        {!loading && sub && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Plan</p>
                {sub.hasSubscription ? (
                  <>
                    <p className="text-xl font-bold text-gray-900 capitalize">{sub.plan}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                      sub.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {sub.status}
                    </span>
                  </>
                ) : (
                  <p className="text-xl font-bold text-gray-500">No active subscription</p>
                )}
              </div>

              {sub.hasSubscription && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Lookups this month</p>
                  <p className="text-xl font-bold text-gray-900">
                    {sub.lookupCount ?? 0}
                    {sub.lookupLimit != null && <span className="text-gray-400 font-normal text-base"> / {sub.lookupLimit}</span>}
                  </p>
                  {sub.lookupLimit != null && sub.lookupCount != null && (
                    <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-brand-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min((sub.lookupCount / sub.lookupLimit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {sub.hasSubscription && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={handlePortal}
                  disabled={actionLoading === "portal"}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "portal" ? "Opening…" : "Manage Billing →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plan cards */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {sub?.hasSubscription ? "Upgrade your plan" : "Choose a plan"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.id && sub?.hasSubscription;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col ${
                  plan.featured ? "border-brand-500 ring-1 ring-brand-500" : "border-gray-200"
                }`}
              >
                {plan.featured && (
                  <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full self-start mb-3 font-medium">
                    Most Popular
                  </span>
                )}
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{plan.price}</p>
                <p className="text-sm text-brand-600 font-medium mb-4">{plan.lookups}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-brand-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button disabled className="w-full py-2.5 text-sm bg-gray-100 text-gray-400 rounded-lg font-medium">
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={!!actionLoading}
                    className={`w-full py-2.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      plan.featured
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "border border-brand-600 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    {actionLoading === plan.id ? "Redirecting…" : sub?.hasSubscription ? "Switch Plan" : "Subscribe"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          All prices in AUD. Cancel or change plan anytime. GST may apply.
        </p>
      </main>
    </div>
  );
}
