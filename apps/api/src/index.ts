import { Hono } from "hono";
import { cors } from "hono/cors";
import { querySuburbs } from "./db";
import { getStripe, createReportCheckout, verifyWebhook } from "./stripe";
import type { SuburbResponse } from "./types";
import type Stripe from "stripe";

export interface Env {
  DB: D1Database;
  REPORTS: R2Bucket;
  CACHE: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DEMOREPORT_URL: string;
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
// GET /api/data/suburb/:name — with KV caching
// ──────────────────────────────────────────────────────────────

app.get("/api/data/suburb/:name", async (c) => {
  const name = c.req.param("name").trim();
  if (!name) return c.json({ error: "Suburb name is required" }, 400);

  const cacheKey = `suburb:${name.toLowerCase()}`;
  const cached = await c.env.CACHE.get(cacheKey, "json") as SuburbResponse[] | null;
  if (cached) return c.json({ data: cached, cached: true });

  let data: SuburbResponse[];
  try {
    data = await querySuburbs(c.env.DB, name, false);
  } catch (err) {
    console.error("D1 query error (suburb):", err);
    return c.json({ error: "Database error" }, 500);
  }

  if (data.length === 0) return c.json({ data: [], cached: false });

  c.executionCtx.waitUntil(
    c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: KV_TTL }),
  );
  return c.json({ data, cached: false });
});

// ──────────────────────────────────────────────────────────────
// GET /api/data/postcode/:code — with KV caching
// ──────────────────────────────────────────────────────────────

app.get("/api/data/postcode/:code", async (c) => {
  const code = c.req.param("code").trim();
  if (!/^\d{4}$/.test(code)) {
    return c.json({ error: "Postcode must be a 4-digit number" }, 400);
  }

  const cacheKey = `postcode:${code}`;
  const cached = await c.env.CACHE.get(cacheKey, "json") as SuburbResponse[] | null;
  if (cached) return c.json({ data: cached, cached: true });

  let data: SuburbResponse[];
  try {
    data = await querySuburbs(c.env.DB, code, true);
  } catch (err) {
    console.error("D1 query error (postcode):", err);
    return c.json({ error: "Database error" }, 500);
  }

  if (data.length === 0) return c.json({ data: [], cached: false });

  c.executionCtx.waitUntil(
    c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: KV_TTL }),
  );
  return c.json({ data, cached: false });
});

// ──────────────────────────────────────────────────────────────
// POST /api/report/generate — query D1 → generate PDF → store R2
// ──────────────────────────────────────────────────────────────

app.post("/api/report/generate", async (c) => {
  interface GenerateBody { suburb?: string; postcode?: string; reportType?: string }
  const body: GenerateBody = await c.req.json<GenerateBody>().catch(() => ({}));
  const { suburb, postcode } = body;

  if (!suburb && !postcode) {
    return c.json({ error: "suburb or postcode is required" }, 400);
  }

  const results = await querySuburbs(c.env.DB, suburb ?? postcode!, !suburb);
  if (results.length === 0) {
    return c.json({ error: "No data found for the given suburb/postcode" }, 404);
  }

  try {
    const report = await generateAndReturnReport(c.env, results[0]);
    return c.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("PDF generation failed:", msg);
    return c.json({ error: "PDF generation failed", detail: msg }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/report/status/:sessionId — poll for report status
// ──────────────────────────────────────────────────────────────

app.get("/api/report/status/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");

  const report = await c.env.DB.prepare(
    "SELECT id, status, suburb, r2_key, error_message FROM reports WHERE stripe_session_id = ?",
  ).bind(sessionId).first<{
    id: string; status: string; suburb: string; r2_key: string | null; error_message: string | null;
  }>();

  if (!report) return c.json({ status: "not_found" }, 404);

  return c.json({
    id: report.id,
    status: report.status,
    suburb: report.suburb,
    downloadUrl: report.status === "ready" ? `/api/report/${report.id}/download` : null,
    error: report.error_message ?? null,
  });
});

// ──────────────────────────────────────────────────────────────
// GET /api/report/:id/download — serve PDF from R2
// ──────────────────────────────────────────────────────────────

app.get("/api/report/:id/download", async (c) => {
  const id = c.req.param("id");

  const report = await c.env.DB.prepare(
    "SELECT status, suburb, r2_key FROM reports WHERE id = ?",
  ).bind(id).first<{ status: string; suburb: string; r2_key: string | null }>();

  if (!report) return c.json({ error: "Report not found" }, 404);
  if (report.status !== "ready") return c.json({ error: "Report not ready yet", status: report.status }, 202);
  if (!report.r2_key) return c.json({ error: "Report file missing" }, 500);

  const obj = await c.env.REPORTS.get(report.r2_key);
  if (!obj) return c.json({ error: "File not found in storage" }, 404);

  const slug = report.suburb.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new Response(obj.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-demoreport.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/create-checkout
// ──────────────────────────────────────────────────────────────

app.post("/api/stripe/create-checkout", async (c) => {
  interface CheckoutBody { suburb?: string; sa2Code?: string }
  const body: CheckoutBody = await c.req.json<CheckoutBody>().catch(() => ({}));
  const { suburb, sa2Code } = body;

  if (!suburb) return c.json({ error: "suburb is required" }, 400);

  const stripe = getStripe(c.env);
  const demoreportUrl = c.env.DEMOREPORT_URL ?? "http://localhost:3001";

  try {
    const session = await createReportCheckout(
      stripe,
      suburb,
      sa2Code ?? "",
      demoreportUrl,
    );
    return c.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe create-checkout error:", err);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/webhook
// ──────────────────────────────────────────────────────────────

app.post("/api/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.json({ error: "Missing stripe-signature" }, 400);

  const payload = await c.req.text();
  const stripe = getStripe(c.env);

  let event: Stripe.Event;
  try {
    event = await verifyWebhook(stripe, payload, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const suburb = session.metadata?.suburb ?? "";
    const sa2Code = session.metadata?.sa2Code ?? "";

    // Create pending report record
    const reportId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO reports (id, suburb, sa2_code, stripe_session_id, stripe_payment_intent, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'generating', unixepoch(), unixepoch())`,
    ).bind(
      reportId,
      suburb,
      sa2Code || null,
      session.id,
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    ).run();

    // Generate PDF in background (non-blocking)
    c.executionCtx.waitUntil(
      generateReportForSession(c.env, reportId, suburb, sa2Code),
    );
  }

  return c.json({ received: true });
});

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

async function generateAndReturnReport(env: Env, data: SuburbResponse) {
  // Dynamically import to avoid bundling @react-pdf/renderer at cold-start
  const { generateFeasibilityReport } = await import("@abs/pdf-generator");

  const reportData = suburbResponseToReportData(data);
  const { buffer, filename } = await generateFeasibilityReport(reportData);

  const r2Key = `reports/${data.sa2Code}/${filename}`;
  await env.REPORTS.put(r2Key, buffer, {
    httpMetadata: { contentType: "application/pdf" },
  });

  return { reportId: crypto.randomUUID(), r2Key, suburb: data.suburb };
}

async function generateReportForSession(
  env: Env,
  reportId: string,
  suburb: string,
  sa2Code: string,
): Promise<void> {
  try {
    // Look up suburb data from D1
    const results = await querySuburbs(env.DB, suburb, false);
    const target = results.find((r) => !sa2Code || r.sa2Code === sa2Code) ?? results[0];

    if (!target) throw new Error(`No suburb data found for "${suburb}"`);

    const { generateFeasibilityReport } = await import("@abs/pdf-generator");
    const reportData = suburbResponseToReportData(target);
    const { buffer, filename } = await generateFeasibilityReport(reportData);

    const r2Key = `reports/${target.sa2Code}/${filename}`;
    await env.REPORTS.put(r2Key, buffer, {
      httpMetadata: { contentType: "application/pdf" },
    });

    await env.DB.prepare(
      "UPDATE reports SET status = 'ready', r2_key = ?, updated_at = unixepoch() WHERE id = ?",
    ).bind(r2Key, reportId).run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("PDF generation failed:", msg);
    await env.DB.prepare(
      "UPDATE reports SET status = 'error', error_message = ?, updated_at = unixepoch() WHERE id = ?",
    ).bind(msg, reportId).run();
  }
}

function suburbResponseToReportData(r: SuburbResponse) {
  return {
    sa2Code:    r.sa2Code,
    suburb:     r.suburb,
    state:      r.state,
    postcode:   r.postcode,
    lga:        r.lga,
    demographics: r.demographics,
    seifa:      r.seifa,
    housing:    r.housing,
    censusYear: r.censusYear,
    generatedAt: new Date().toISOString(),
  };
}

export default app;
