import { Hono } from "hono";
import { cors } from "hono/cors";
import { querySuburbs } from "./db";
import { getStripe, createReportCheckout, verifyWebhook, type ReportPlan, PLAN_PRICES } from "./stripe";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  checkLookupLimit,
  type Variables,
} from "./auth";
import type { SuburbResponse } from "./types";
import type Stripe from "stripe";

export interface Env {
  DB: D1Database;
  REPORTS: R2Bucket;
  CACHE: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DEMOREPORT_URL: string;
  GRANTDATA_URL: string;
  JWT_SECRET: string;
  STRIPE_PRICE_STARTER: string;
  STRIPE_PRICE_PROFESSIONAL: string;
  STRIPE_PRICE_TEAM: string;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const KV_TTL = 60 * 60 * 24; // 24 hours

/** Simple KV-backed rate limiter. Returns true if the request should be blocked. */
async function isRateLimited(
  kv: KVNamespace,
  ip: string,
  key: string,
  limit: number,
  windowSecs: number,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / windowSecs);
  const kvKey = `rl:${key}:${ip}:${bucket}`;
  const current = parseInt((await kv.get(kvKey)) ?? "0", 10);
  if (current >= limit) return true;
  await kv.put(kvKey, String(current + 1), { expirationTtl: windowSecs * 2 });
  return false;
}

app.use("*", cors({
  origin: ["https://demoreport.workswell.com.au", "https://grantdata.workswell.com.au", "http://localhost:3000", "http://localhost:3001"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 0,
}));

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
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  if (await isRateLimited(c.env.CACHE, ip, "data", 60, 60)) {
    return c.json({ error: "Too many requests — please slow down." }, 429);
  }

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
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  if (await isRateLimited(c.env.CACHE, ip, "data", 60, 60)) {
    return c.json({ error: "Too many requests — please slow down." }, 429);
  }

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
    "SELECT id, status, suburb, report_type, r2_key, error_message FROM reports WHERE stripe_session_id = ?",
  ).bind(sessionId).first<{
    id: string; status: string; suburb: string; report_type: string; r2_key: string | null; error_message: string | null;
  }>();

  if (!report) return c.json({ status: "not_found" }, 404);

  return c.json({
    id: report.id,
    status: report.status,
    suburb: report.suburb,
    plan: report.report_type,
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
// GET /api/report/:id/data — serve JSON report data for HTML viewer
// ──────────────────────────────────────────────────────────────

app.get("/api/report/:id/data", async (c) => {
  const id = c.req.param("id");

  const report = await c.env.DB.prepare(
    "SELECT status FROM reports WHERE id = ?",
  ).bind(id).first<{ status: string }>();

  if (!report) return c.json({ error: "Report not found" }, 404);
  if (report.status !== "ready") return c.json({ error: "Report not ready yet", status: report.status }, 202);

  const obj = await c.env.REPORTS.get(`reports/${id}/data.json`);
  if (!obj) return c.json({ error: "Report data not found" }, 404);

  const data = await obj.json();
  return c.json(data);
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (c) => {
  interface RegisterBody { email?: string; password?: string; name?: string }
  const body: RegisterBody = await c.req.json<RegisterBody>().catch(() => ({}));
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "Invalid email address" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?",
  ).bind(email.toLowerCase()).first<{ id: string }>();

  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const userId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, salt, name, product)
     VALUES (?, ?, ?, ?, ?, 'grantdata')`,
  ).bind(userId, email.toLowerCase(), hash, salt, name ?? null).run();

  const token = await signToken(
    { sub: userId, email: email.toLowerCase(), name: name ?? null, product: "grantdata" },
    c.env.JWT_SECRET,
  );

  return c.json({ token, user: { id: userId, email: email.toLowerCase(), name: name ?? null } }, 201);
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────────────────────

app.post("/api/auth/login", async (c) => {
  interface LoginBody { email?: string; password?: string }
  const body: LoginBody = await c.req.json<LoginBody>().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash, salt, name, product FROM users WHERE email = ?",
  ).bind(email.toLowerCase()).first<{
    id: string; email: string; password_hash: string; salt: string;
    name: string | null; product: string;
  }>();

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash, user.salt);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await signToken(
    { sub: user.id, email: user.email, name: user.name, product: user.product },
    c.env.JWT_SECRET,
  );

  return c.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// ──────────────────────────────────────────────────────────────
// GET /api/auth/me — current user (protected)
// ──────────────────────────────────────────────────────────────

app.get("/api/auth/me", requireAuth, async (c) => {
  const userId = c.get("userId");

  const user = await c.env.DB.prepare(
    "SELECT id, email, name, product, stripe_customer_id, created_at FROM users WHERE id = ?",
  ).bind(userId).first<{
    id: string; email: string; name: string | null; product: string;
    stripe_customer_id: string | null; created_at: number;
  }>();

  if (!user) return c.json({ error: "User not found" }, 404);

  const sub = await c.env.DB.prepare(
    "SELECT plan, status, lookup_count, current_period_end FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
  ).bind(userId).first<{
    plan: string; status: string; lookup_count: number; current_period_end: number | null;
  }>();

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    product: user.product,
    subscription: sub ?? null,
  });
});

// ──────────────────────────────────────────────────────────────
// GET /api/user/saved-regions (protected)
// ──────────────────────────────────────────────────────────────

app.get("/api/user/saved-regions", requireAuth, async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, sa2_code, suburb, postcode, state, created_at FROM saved_regions WHERE user_id = ? ORDER BY created_at DESC",
  ).bind(userId).all<{
    id: string; sa2_code: string; suburb: string; postcode: string | null;
    state: string | null; created_at: number;
  }>();
  return c.json({ data: results ?? [] });
});

// ──────────────────────────────────────────────────────────────
// POST /api/user/saved-regions (protected)
// ──────────────────────────────────────────────────────────────

app.post("/api/user/saved-regions", requireAuth, async (c) => {
  const userId = c.get("userId");
  interface SaveBody { sa2Code?: string; suburb?: string; postcode?: string; state?: string }
  const body: SaveBody = await c.req.json<SaveBody>().catch(() => ({}));
  const { sa2Code, suburb, postcode, state } = body;

  if (!sa2Code || !suburb) {
    return c.json({ error: "sa2Code and suburb are required" }, 400);
  }

  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO saved_regions (id, user_id, sa2_code, suburb, postcode, state)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), userId, sa2Code, suburb, postcode ?? null, state ?? null).run();

  return c.json({ ok: true }, 201);
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/user/saved-regions/:sa2Code (protected)
// ──────────────────────────────────────────────────────────────

app.delete("/api/user/saved-regions/:sa2Code", requireAuth, async (c) => {
  const userId = c.get("userId");
  const sa2Code = c.req.param("sa2Code");
  await c.env.DB.prepare(
    "DELETE FROM saved_regions WHERE user_id = ? AND sa2_code = ?",
  ).bind(userId, sa2Code).run();
  return c.json({ ok: true });
});

// ──────────────────────────────────────────────────────────────
// GET /api/subscription/status (protected)
// ──────────────────────────────────────────────────────────────

app.get("/api/subscription/status", requireAuth, async (c) => {
  const userId = c.get("userId");
  const sub = await c.env.DB.prepare(
    `SELECT plan, status, lookup_count, current_period_end, stripe_subscription_id
     FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(userId).first<{
    plan: string; status: string; lookup_count: number;
    current_period_end: number | null; stripe_subscription_id: string | null;
  }>();

  if (!sub) return c.json({ hasSubscription: false });

  const PLAN_LIMITS: Record<string, number | null> = { starter: 50, professional: null, team: null };
  const limit = PLAN_LIMITS[sub.plan] ?? null;

  return c.json({
    hasSubscription: true,
    plan: sub.plan,
    status: sub.status,
    lookupCount: sub.lookup_count,
    lookupLimit: limit,
    currentPeriodEnd: sub.current_period_end,
  });
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/create-checkout — DemoReport one-time payment
// ──────────────────────────────────────────────────────────────

app.post("/api/stripe/create-checkout", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  if (await isRateLimited(c.env.CACHE, ip, "checkout", 5, 60)) {
    return c.json({ error: "Too many requests — please try again in a minute." }, 429);
  }

  interface CheckoutBody { suburb?: string; sa2Code?: string; plan?: string }
  const body: CheckoutBody = await c.req.json<CheckoutBody>().catch(() => ({}));
  const { suburb, sa2Code, plan: planRaw } = body;

  console.log("[checkout] input:", JSON.stringify({ suburb, sa2Code, plan: planRaw }));

  if (!suburb) {
    console.warn("[checkout] rejected: suburb missing");
    return c.json({ error: "suburb is required" }, 400);
  }

  const validPlans: ReportPlan[] = ["single", "professional", "enterprise"];
  const plan: ReportPlan = validPlans.includes(planRaw as ReportPlan)
    ? (planRaw as ReportPlan)
    : "single";

  const stripe = getStripe(c.env);
  const demoreportUrl = c.env.DEMOREPORT_URL ?? "http://localhost:3001";

  console.log("[checkout] calling Stripe:", { suburb, sa2Code, plan, demoreportUrl });

  try {
    const session = await createReportCheckout(stripe, suburb, sa2Code ?? "", demoreportUrl, plan);
    console.log("[checkout] success:", { sessionId: session.id, url: session.url, plan, priceCents: PLAN_PRICES[plan] });
    return c.json({ url: session.url, sessionId: session.id, plan, priceCents: PLAN_PRICES[plan] });
  } catch (err) {
    console.error("[checkout] Stripe error:", err instanceof Error ? { message: err.message, stack: err.stack } : err);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/create-subscription — GrantData recurring billing
// ──────────────────────────────────────────────────────────────

app.post("/api/stripe/create-subscription", requireAuth, async (c) => {
  interface SubBody { plan?: string }
  const body: SubBody = await c.req.json<SubBody>().catch(() => ({}));
  const { plan } = body;

  const priceMap: Record<string, string> = {
    starter:      c.env.STRIPE_PRICE_STARTER,
    professional: c.env.STRIPE_PRICE_PROFESSIONAL,
    team:         c.env.STRIPE_PRICE_TEAM,
  };

  const priceId = plan ? priceMap[plan] : undefined;
  if (!priceId) {
    return c.json({ error: "plan must be starter, professional, or team" }, 400);
  }

  const userId = c.get("userId");
  const user = await c.env.DB.prepare(
    "SELECT email, name, stripe_customer_id FROM users WHERE id = ?",
  ).bind(userId).first<{ email: string; name: string | null; stripe_customer_id: string | null }>();

  if (!user) return c.json({ error: "User not found" }, 404);

  const stripe = getStripe(c.env);
  const grantdataUrl = c.env.GRANTDATA_URL ?? "http://localhost:3002";

  try {
    // Reuse or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await c.env.DB.prepare(
        "UPDATE users SET stripe_customer_id = ?, updated_at = unixepoch() WHERE id = ?",
      ).bind(customerId, userId).run();
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${grantdataUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${grantdataUrl}/dashboard/billing`,
      metadata: { userId, plan: plan! },
    });

    return c.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe create-subscription error:", err);
    return c.json({ error: "Failed to create subscription checkout" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/customer-portal — manage existing subscription
// ──────────────────────────────────────────────────────────────

app.post("/api/stripe/customer-portal", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE id = ?",
  ).bind(userId).first<{ stripe_customer_id: string | null }>();

  if (!user?.stripe_customer_id) {
    return c.json({ error: "No billing account found" }, 404);
  }

  const stripe = getStripe(c.env);
  const grantdataUrl = c.env.GRANTDATA_URL ?? "http://localhost:3002";

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${grantdataUrl}/dashboard/billing`,
    });
    return c.json({ url: portal.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return c.json({ error: "Failed to create billing portal session" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/stripe/webhook — handles both products
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

  // ── DemoReport: one-time payment ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === "payment") {
      const suburb  = session.metadata?.suburb ?? "";
      const sa2Code = session.metadata?.sa2Code ?? "";
      const plan    = (session.metadata?.plan ?? "single") as ReportPlan;
      const reportId = crypto.randomUUID();

      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO reports (id, suburb, sa2_code, stripe_session_id, stripe_payment_intent, status, report_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'generating', ?, unixepoch(), unixepoch())`,
      ).bind(
        reportId, suburb, sa2Code || null, session.id,
        typeof session.payment_intent === "string" ? session.payment_intent : null,
        plan,
      ).run();

      c.executionCtx.waitUntil(
        generateReportForSession(c.env, reportId, suburb, sa2Code, plan),
      );
    }

    // ── GrantData: subscription checkout completed ──
    if (session.mode === "subscription") {
      const userId = session.metadata?.userId ?? "";
      const plan = session.metadata?.plan ?? "starter";
      const stripeSubId = typeof session.subscription === "string"
        ? session.subscription : null;

      if (userId && stripeSubId) {
        await c.env.DB.prepare(
          `INSERT OR REPLACE INTO subscriptions
             (id, user_id, stripe_subscription_id, plan, status, created_at, updated_at)
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'active', unixepoch(), unixepoch())`,
        ).bind(userId, stripeSubId, plan).run();
      }
    }
  }

  // ── GrantData: subscription lifecycle events ──
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const plan = (sub.items.data[0]?.price.metadata?.plan ?? "starter") as string;
    const status = sub.status;
    const periodEnd = sub.current_period_end;

    await c.env.DB.prepare(
      `UPDATE subscriptions
       SET plan = ?, status = ?, current_period_end = ?, updated_at = unixepoch()
       WHERE stripe_subscription_id = ?`,
    ).bind(plan, status, periodEnd, sub.id).run();
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await c.env.DB.prepare(
      "UPDATE subscriptions SET status = 'canceled', updated_at = unixepoch() WHERE stripe_subscription_id = ?",
    ).bind(sub.id).run();
  }

  return c.json({ received: true });
});

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

async function generateAndReturnReport(env: Env, data: SuburbResponse) {
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
  plan: ReportPlan = "single",
): Promise<void> {
  try {
    // Fetch primary suburb data
    const results = await querySuburbs(env.DB, suburb, false);
    const target = results.find((r) => !sa2Code || r.sa2Code === sa2Code) ?? results[0];
    if (!target) throw new Error(`No suburb data found for "${suburb}"`);

    const { generateFeasibilityReport, generateComparisonReport, generateEnterpriseReport } = await import("@abs/pdf-generator");

    let buffer: Uint8Array;
    let filename: string;
    let neighbours: SuburbResponse[] = [];

    if (plan === "professional") {
      // Fetch up to 2 neighbouring SA2s (same state, adjacent codes)
      neighbours = await getNeighbouringSA2s(env.DB, target.sa2Code, target.state, 2);
      const result = await generateComparisonReport(
        suburbResponseToReportData(target),
        neighbours.map(suburbResponseToReportData),
      );
      buffer = result.buffer;
      filename = result.filename;

    } else if (plan === "enterprise") {
      // Fetch up to 3 additional SA2s for 4-way comparison
      neighbours = await getNeighbouringSA2s(env.DB, target.sa2Code, target.state, 3);
      const result = await generateEnterpriseReport(
        suburbResponseToReportData(target),
        neighbours.map(suburbResponseToReportData),
      );
      buffer = result.buffer;
      filename = result.filename;

    } else {
      // Single report (default)
      const result = await generateFeasibilityReport(suburbResponseToReportData(target));
      buffer = result.buffer;
      filename = result.filename;
    }

    const r2Key = `reports/${target.sa2Code}/${plan}/${filename}`;
    await env.REPORTS.put(r2Key, buffer, {
      httpMetadata: { contentType: "application/pdf" },
    });

    // Store structured JSON for the HTML report viewer
    const jsonKey = `reports/${reportId}/data.json`;
    const viewData = { plan, suburb: target.suburb, primary: target, neighbours, generatedAt: new Date().toISOString() };
    await env.REPORTS.put(jsonKey, JSON.stringify(viewData), {
      httpMetadata: { contentType: "application/json" },
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

/** Return up to `limit` SA2s in the same state with adjacent SA2 codes. */
async function getNeighbouringSA2s(
  db: D1Database,
  sa2Code: string,
  state: string,
  limit: number,
): Promise<SuburbResponse[]> {
  try {
    const rows = await db.prepare(
      `SELECT sa2_code FROM sa2_areas
       WHERE state = ? AND sa2_code != ?
       ORDER BY ABS(CAST(sa2_code AS INTEGER) - CAST(? AS INTEGER))
       LIMIT ?`,
    ).bind(state, sa2Code, sa2Code, limit).all<{ sa2_code: string }>();

    const neighbours: SuburbResponse[] = [];
    for (const row of rows.results) {
      const results = await querySuburbs(db, row.sa2_code, false);
      if (results[0]) neighbours.push(results[0]);
    }
    return neighbours;
  } catch {
    return [];
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
