import Stripe from "stripe";
import type { Env } from "./index";

/** Create a Stripe client configured for Cloudflare Workers (fetch-based HTTP). */
export function getStripe(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    // Workers don't have Node.js http — use the fetch-based client
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export const REPORT_PRICE_CENTS = 9900; // $99.00 AUD

/** Create a Stripe Checkout session for a single suburb report. */
export async function createReportCheckout(
  stripe: Stripe,
  suburb: string,
  sa2Code: string,
  demoreportUrl: string,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: `DemoReport: ${suburb}`,
            description: `Demographic feasibility report for ${suburb} — ABS Census 2021`,
          },
          unit_amount: REPORT_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${demoreportUrl}/report/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${demoreportUrl}/report?suburb=${encodeURIComponent(suburb)}`,
    metadata: { suburb, sa2Code },
    payment_intent_data: {
      metadata: { suburb, sa2Code },
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
