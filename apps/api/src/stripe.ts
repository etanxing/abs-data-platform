import Stripe from "stripe";
import type { Env } from "./index";

/** Create a Stripe client configured for Cloudflare Workers (fetch-based HTTP). */
export function getStripe(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    // Workers don't have Node.js http — use the fetch-based client
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export type ReportPlan = "single" | "professional" | "enterprise";

export const PLAN_PRICES: Record<ReportPlan, number> = {
  single:       9900,   // $99.00 AUD
  professional: 19900,  // $199.00 AUD
  enterprise:   29900,  // $299.00 AUD
};

export const PLAN_NAMES: Record<ReportPlan, string> = {
  single:       "DemoReport Single",
  professional: "DemoReport Professional",
  enterprise:   "DemoReport Enterprise",
};

export const PLAN_DESCRIPTIONS: Record<ReportPlan, string> = {
  single:       "10-page demographic feasibility report — 1 suburb, ABS Census 2021",
  professional: "10-page report + comparison with up to 2 neighbouring suburbs",
  enterprise:   "Up to 4 suburb comparison + AI-generated executive narrative",
};

/** Create a Stripe Checkout session for a DemoReport purchase. */
export async function createReportCheckout(
  stripe: Stripe,
  suburb: string,
  sa2Code: string,
  demoreportUrl: string,
  plan: ReportPlan = "single",
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: `${PLAN_NAMES[plan]}: ${suburb}`,
            description: PLAN_DESCRIPTIONS[plan],
          },
          unit_amount: PLAN_PRICES[plan],
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${demoreportUrl}/report/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${demoreportUrl}/report?suburb=${encodeURIComponent(suburb)}`,
    metadata: { suburb, sa2Code, plan },
    payment_intent_data: {
      metadata: { suburb, sa2Code, plan },
    },
  });
}

/** Verify a Stripe webhook signature. Workers must use the async variant. */
export async function verifyWebhook(
  stripe: Stripe,
  payload: string,
  signature: string,
  secret: string,
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEventAsync(payload, signature, secret);
}
