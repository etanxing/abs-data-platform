import type { SuburbResponse } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSuburb(suburb: string): Promise<SuburbResponse[] | null> {
  const data = await apiGet<{ data: SuburbResponse[] }>(
    `/api/data/suburb/${encodeURIComponent(suburb)}`,
  );
  return data?.data ?? null;
}

export async function fetchPostcode(postcode: string): Promise<SuburbResponse[] | null> {
  const data = await apiGet<{ data: SuburbResponse[] }>(
    `/api/data/postcode/${encodeURIComponent(postcode)}`,
  );
  return data?.data ?? null;
}

export type ReportPlan = "single" | "professional" | "enterprise";

export async function createCheckoutSession(
  suburb: string,
  sa2Code: string,
  plan: ReportPlan = "single",
): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/stripe/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suburb, sa2Code, plan }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return json.url ?? null;
  } catch {
    return null;
  }
}

export async function fetchReportStatus(sessionId: string): Promise<{
  id: string;
  status: string;
  suburb: string;
  downloadUrl: string | null;
} | null> {
  return apiGet(`/api/report/status/${encodeURIComponent(sessionId)}`);
}
