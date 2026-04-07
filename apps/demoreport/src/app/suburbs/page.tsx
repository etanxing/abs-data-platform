import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SUBURBS, getSydneySuburbs, getMelbourneSuburbs } from "@/data/suburbs";

export const metadata: Metadata = {
  title: "Suburb Demographic Reports | Sydney & Melbourne | DemoReport",
  description:
    "Browse demographic feasibility reports for 50 top suburbs across Sydney and Melbourne. Free sample data powered by ABS Census 2021 and SEIFA 2021.",
  openGraph: {
    title: "Suburb Demographic Reports | Sydney & Melbourne",
    description:
      "Browse demographic feasibility reports for 50 top suburbs across Sydney and Melbourne.",
    type: "website",
  },
};

function SuburbCard({ name, slug, state, city, postcode, population, medianAge, seifaDecile }: {
  name: string;
  slug: string;
  state: string;
  city: string;
  postcode: string;
  population: number;
  medianAge: number;
  seifaDecile: number;
}) {
  return (
    <Link
      href={`/suburb/${slug}/`}
      className="group block bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-500 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
            {name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {state} · {postcode}
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-50 text-brand-700">
          {city}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Population</p>
          <p className="text-sm font-semibold text-gray-800">{population.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Median Age</p>
          <p className="text-sm font-semibold text-gray-800">{medianAge}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">SEIFA</p>
          <p className="text-sm font-semibold text-gray-800">{seifaDecile}/10</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-brand-600 font-medium group-hover:underline">
        View free data →
      </p>
    </Link>
  );
}

export default function SuburbsPage() {
  const sydneySuburbs = getSydneySuburbs();
  const melbourneSuburbs = getMelbourneSuburbs();

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-brand-600 mb-2">
                Free Demographic Data
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Sydney &amp; Melbourne Suburb Reports
              </h1>
              <p className="text-lg text-gray-600">
                Browse free demographic summaries for {SUBURBS.length} top suburbs.
                Powered by ABS Census 2021 and SEIFA 2021. Get the full feasibility
                report for any suburb in minutes.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Sydney */}
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sydney</h2>
              <span className="text-sm text-gray-500">
                {sydneySuburbs.length} suburbs
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sydneySuburbs.map((s) => (
                <SuburbCard key={s.slug} {...s} />
              ))}
            </div>
          </section>

          {/* Melbourne */}
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Melbourne</h2>
              <span className="text-sm text-gray-500">
                {melbourneSuburbs.length} suburbs
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {melbourneSuburbs.map((s) => (
                <SuburbCard key={s.slug} {...s} />
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="bg-brand-600 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Need the Full Report?
            </h2>
            <p className="text-brand-100 mb-6 max-w-xl mx-auto">
              Get income distribution, housing tenure breakdown, age cohort analysis,
              language diversity, SEIFA scores, and more — exported as a
              professional PDF.
            </p>
            <Link
              href="/#pricing"
              className="inline-block px-8 py-3 bg-white text-brand-700 font-semibold rounded-lg hover:bg-brand-50 transition-colors"
            >
              Get Full Report — from $49
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
