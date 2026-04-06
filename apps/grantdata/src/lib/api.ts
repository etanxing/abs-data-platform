import { getToken } from "./auth";
import type { SuburbData, User, SavedRegion, SubscriptionStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Search ──────────────────────────────────────────────────────

export async function searchSuburb(name: string): Promise<SuburbData[]> {
  const r = await apiFetch<{ data: SuburbData[] }>(`/api/data/suburb/${encodeURIComponent(name)}`);
  return r.data;
}

export async function searchPostcode(code: string): Promise<SuburbData[]> {
  const r = await apiFetch<{ data: SuburbData[] }>(`/api/data/postcode/${encodeURIComponent(code)}`);
  return r.data;
}

// ── Auth ─────────────────────────────────────────────────────────

export async function register(email: string, password: string, name: string) {
  return apiFetch<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  return apiFetch<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/api/auth/me");
}

// ── Saved regions ─────────────────────────────────────────────────

export async function getSavedRegions(): Promise<SavedRegion[]> {
  const r = await apiFetch<{ data: SavedRegion[] }>("/api/user/saved-regions");
  return r.data;
}

export async function saveRegion(data: {
  sa2Code: string;
  suburb: string;
  postcode?: string | null;
  state?: string | null;
}): Promise<void> {
  await apiFetch("/api/user/saved-regions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSavedRegion(sa2Code: string): Promise<void> {
  await apiFetch(`/api/user/saved-regions/${encodeURIComponent(sa2Code)}`, {
    method: "DELETE",
  });
}

// ── Subscription ─────────────────────────────────────────────────

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiFetch<SubscriptionStatus>("/api/subscription/status");
}

export async function createSubscriptionCheckout(plan: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/api/stripe/create-subscription", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function createCustomerPortal(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/api/stripe/customer-portal", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
