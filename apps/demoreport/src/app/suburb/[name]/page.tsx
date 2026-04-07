import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SUBURBS, getSuburbBySlug } from "@/data/suburbs";

export function generateStaticParams() {
  return SUBURBS.map((s) => ({ name: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const suburb = getSuburbBySlug(name);
  if (!suburb) return {};

  const title = `${suburb.name} Demographics & Feasibility Report | DemoReport`;
  const description = `Free demographic data for ${suburb.name}, ${suburb.state} (${suburb.postcode}). Population ${suburb.population.toLocaleString()}, median age ${suburb.medianAge}, SEIFA decile ${suburb.seifaDecile}/10. Get the full ABS Census 2021 report.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `/suburb/${suburb.slug}/`,
    },
  };
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LockedCard({ label }: { label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
          {label}
        </p>
        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="text-gray-300">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

export default async function SuburbPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const suburb = getSuburbBySlug(name);
  if (!suburb) notFound();

  const seifaLabel =
    suburb.seifaDecile >= 8
      ? "High advantage"
      : suburb.seifaDecile >= 5
        ? "Average"
        : "Below average";

  const ownerPct = Math.round(suburb.ownerOccupiedPct * 100);
  const rentPct = 100 - ownerPct;

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="text-sm text-gray-500 flex gap-2">
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
              <span>/</span>
              <Link href="/suburbs/" className="hover:text-gray-700">
                Suburbs
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{suburb.name}</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-50 text-brand-700">
                    {suburb.city}
                  </span>
                  <span className="text-xs text-gray-400">
                    {suburb.state} · {suburb.postcode}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  {suburb.name}
                </h1>
                <p className="text-gray-600 max-w-2xl">{suburb.description}</p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/#pricing"
                  className="inline-block px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
                >
                  Get Full Report — $49
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          {/* Free data */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Free Sample Data
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                ABS Census 2021
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard
                label="Population"
                value={suburb.population.toLocaleString()}
                sub="Census 2021"
              />
              <StatCard
                label="Median Age"
                value={String(suburb.medianAge)}
                sub="years"
              />
              <StatCard
                label="SEIFA Decile"
                value={`${suburb.seifaDecile}/10`}
                sub={seifaLabel}
              />
              <StatCard
                label="Owner Occupied"
                value={`${ownerPct}%`}
                sub={`${rentPct}% renting`}
              />
            </div>
          </section>

          {/* Locked premium data */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Full Report Data
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                Unlocks with purchase
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              <LockedCard label="Median Household Income" />
              <LockedCard label="Median Weekly Rent" />
              <LockedCard label="Median Mortgage" />
              <LockedCard label="Born Overseas" />
              <LockedCard label="English Only Spoken" />
              <LockedCard label="Families with Children" />
              <LockedCard label="IRSD Score" />
              <LockedCard label="Age Distribution" />
            </div>
            <p className="text-sm text-gray-500">
              Plus top languages, social housing rate, single-parent families
              percentage, and full SEIFA index breakdown (IRSD, IRSAD, IER,
              IEO).
            </p>
          </section>

          {/* What you get CTA */}
          <section className="bg-brand-600 rounded-2xl p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-3">
                Get the Full {suburb.name} Report
              </h2>
              <p className="text-brand-100 mb-6">
                The complete demographic feasibility report for {suburb.name}{" "}
                includes income breakdown, housing tenure, age cohort charts,
                language diversity, all four SEIFA indices, and more — exported
                as a professional PDF you can share with investors and councils.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "ABS Census 2021 demographics",
                  "SEIFA 2021 full index breakdown",
                  "Housing tenure and rent/mortgage data",
                  "Age distribution chart",
                  "Language diversity table",
                  "Professional PDF export",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <svg
                      className="w-4 h-4 text-brand-300 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/#pricing"
                className="inline-block px-8 py-3 bg-white text-brand-700 font-semibold rounded-lg hover:bg-brand-50 transition-colors"
              >
                Get Full Report — from $49
              </Link>
            </div>
          </section>

          {/* Browse more */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                More {suburb.city} Suburbs
              </h2>
              <Link
                href="/suburbs/"
                className="text-sm text-brand-600 hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SUBURBS.filter(
                (s) => s.city === suburb.city && s.slug !== suburb.slug,
              )
                .slice(0, 4)
                .map((s) => (
                  <Link
                    key={s.slug}
                    href={`/suburb/${s.slug}/`}
                    className="group block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-500 transition-colors"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors text-sm">
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.state} · {s.postcode}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
