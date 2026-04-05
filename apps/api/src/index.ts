import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: D1Database;
  REPORTS: R2Bucket;
  CACHE: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/data/suburb/:name", async (c) => {
  const name = c.req.param("name");
  // TODO: Query DB for suburb data
  return c.json({
    suburb: name,
    data: null,
    message: "Not yet implemented",
  });
});

app.get("/api/data/postcode/:code", async (c) => {
  const code = c.req.param("code");
  // TODO: Query DB for all suburbs in postcode
  return c.json({
    postcode: code,
    suburbs: [],
    message: "Not yet implemented",
  });
});

app.post("/api/report/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  // TODO: Validate body, generate PDF, store in R2, return presigned URL
  void body;
  return c.json({ reportId: null, message: "Not yet implemented" }, 501);
});

app.post("/api/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }
  // TODO: Verify signature, handle events (checkout.session.completed, etc.)
  return c.json({ received: true });
});

export default app;
