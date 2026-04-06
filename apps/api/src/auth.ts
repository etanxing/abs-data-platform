import { sign, verify } from "hono/jwt";
import type { JWTPayload } from "hono/utils/jwt/types";
import type { Context, Next } from "hono";
import type { Env } from "./index";

// ──────────────────────────────────────────────────────────────
// Password hashing — PBKDF2 via Web Crypto (Workers-compatible)
// ──────────────────────────────────────────────────────────────

const ITERATIONS = 100_000;
const KEY_LENGTH = 256; // bits

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((h) => parseInt(h, 16)));
}

export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toHex(saltBytes.buffer);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const hashBuf = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH,
  );

  return { hash: toHex(hashBuf), salt };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  const saltBytes = fromHex(storedSalt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const hashBuf = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH,
  );

  return toHex(hashBuf) === storedHash;
}

// ──────────────────────────────────────────────────────────────
// JWT helpers — Hono sign/verify (HS256, Web Crypto)
// ──────────────────────────────────────────────────────────────

const JWT_TTL = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  sub: string;   // user id
  email: string;
  name: string | null;
  product: string;
}

export async function signToken(
  payload: TokenPayload,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ ...payload, iat: now, exp: now + JWT_TTL }, secret, "HS256");
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<JWTPayload & TokenPayload> {
  const decoded = await verify(token, secret, "HS256");
  return decoded as JWTPayload & TokenPayload;
}

// ──────────────────────────────────────────────────────────────
// Auth middleware — injects userId into Hono context variables
// ──────────────────────────────────────────────────────────────

export type Variables = { userId: string };

export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
): Promise<Response | void> {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = header.slice(7);
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set("userId", payload.sub as string);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

// ──────────────────────────────────────────────────────────────
// Subscription lookup-limit check
// ──────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number | null> = {
  starter:      50,
  professional: null, // unlimited
  team:         null, // unlimited
};

export async function checkLookupLimit(
  db: D1Database,
  userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await db
    .prepare("SELECT plan, status, lookup_count, lookup_reset_at FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(userId)
    .first<{ plan: string; status: string; lookup_count: number; lookup_reset_at: number }>();

  if (!sub || sub.status === "canceled") {
    return { allowed: false, reason: "no_active_subscription" };
  }

  // Reset monthly counter if period has passed (30-day rolling)
  const now = Math.floor(Date.now() / 1000);
  const shouldReset = now - sub.lookup_reset_at > 60 * 60 * 24 * 30;
  if (shouldReset) {
    await db
      .prepare("UPDATE subscriptions SET lookup_count = 0, lookup_reset_at = unixepoch() WHERE user_id = ?")
      .bind(userId)
      .run();
    sub.lookup_count = 0;
  }

  const limit = PLAN_LIMITS[sub.plan] ?? null;
  if (limit !== null && sub.lookup_count >= limit) {
    return { allowed: false, reason: "lookup_limit_reached" };
  }

  // Increment lookup count
  await db
    .prepare("UPDATE subscriptions SET lookup_count = lookup_count + 1, updated_at = unixepoch() WHERE user_id = ?")
    .bind(userId)
    .run();

  return { allowed: true };
}
