import { Hono } from "hono";
import { cors } from "hono/cors";
import { querySuburbs } from "./db";
import type { SuburbResponse } from "./types";

export interface Env {
  DB: D1Database;
  REPORTS: R2Bucket;
  CACHE: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

const KV_TTL = 60 * 60 * 24; // 24 hours

app.use("*", cors());

// ──────────────────────────────────────────────────────────────
// Health
// ──────────────────────────────────────────────────────────────

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────────────────────
// GET /api/data/suburb/:name
// Fuzzy-match SA2 suburb name; returns up to 20 results.
// ──────────────────────────────────────────────────────────────

app.get("/api/data/suburb/:name", async (c) => {
  const name = c.req.param("name").trim();
  if (!name) {
    return c.json({ error: "Suburb name is required" }, 400);
  }

  const cacheKey = `suburb:${name.toLowerCase()}`;

  // 1. KV cache hit
  const cached = await c.env.CACHE.get(cacheKey, "json") as SuburbResponse[] | null;
  if (cached) {
    return c.json({ data: cached, cached: true });
  }

  // 2. D1 query
  let data: SuburbResponse[];
  try {
    data = await querySuburbs(c.env.DB, name, false);
  } catch (err) {
    console.error("D1 query error (suburb):", err);
    return c.json({ error: "Database error" }, 500);
  }

  if (data.length === 0) {
    return c.json({ data: [], cached: false });
  }

  // 3. Write to KV (fire-and-forget; don't block response)
  c.executionCtx.waitUntil(
    c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: KV_TTL }),
  );

  return c.json({ data, cached: false });
});

// ──────────────────────────────────────────────────────────────
// GET /api/data/postcode/:code
// Look up all SA2s within a postcode; returns up to 20 results.
// ──────────────────────────────────────────────────────────────

app.get("/api/data/postcode/:code", async (c) => {
  const code = c.req.param("code").trim();
  if (!/^\d{4}$/.test(code)) {
    return c.json({ error: "Postcode must be a 4-digit number" }, 400);
  }

  const cacheKey = `postcode:${code}`;

  const cached = await c.env.CACHE.get(cacheKey, "json") as SuburbResponse[] | null;
  if (cached) {
    return c.json({ data: cached, cached: true });
  }

  let data: SuburbResponse[];
  try {
    data = await querySuburbs(c.env.DB, code, true);
  } catch (err) {
    console.error("D1 query error (postcode):", err);
    return c.json({ error: "Database error" }, 500);
  }

  if (data.length === 0) {
    return c.json({ data: [], cached: false });
  }

  c.executionCtx.waitUntil(
    c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: KV_TTL }),
  );

  return c.json({ data, cached: false });
});

// ──────────────────────────────────────────────────────────────
// POST /api/report/generate
// ──────────────────────────────────────────────────────────────

app.post("/api/report/generate", async (c) => {
  interface ReportBody {
    suburb?: string;
    postcode?: string;
    reportType?: "feasibility" | "needs-assessment";
  }
  const body: ReportBody = await c.req.json<ReportBody>().catch(() => ({}));

  const { suburb, postcode, reportType = "feasibility" } = body;

  if (!suburb && !postcode) {
    return c.json({ error: "suburb or postcode is required" }, 400);
  }

  // TODO: look up data, generate PDF with @abs/pdf-generator, store in R2
  // Stub: return 501 with a clear message
  return c.json(
    {
      reportId: null,
      status: "not_implemented",
      message: "PDF generation coming in Phase 2. Supply suburb or postcode to test lookups.",
      params: { suburb, postcode, reportType },
    },
    501,
  );
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/webhook
// ──────────────────────────────────────────────────────────────

app.post("/api/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  // TODO: Verify Stripe signature with STRIPE_WEBHOOK_SECRET (env var)
  // TODO: Handle events: checkout.session.completed → provision report access
  const payload = await c.req.text();
  console.log("Stripe webhook received, signature:", signature.slice(0, 20) + "…");
  void payload;

  return c.json({ received: true });
});

export default app;
