"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What data sources are used?",
    a: "All demographic data comes from the ABS Census of Population and Housing 2021 and SEIFA (Socio-Economic Indexes for Areas) 2021. These are the most recent official national datasets available. Data covers NSW and Victoria at SA2 (suburb-level) geography.",
  },
  {
    q: "How current is the data?",
    a: "The underlying data is from the 2021 ABS Census. The next full Census is expected in 2026. For most planning and development purposes, 2021 data remains the definitive source, as it is what councils and planning authorities reference.",
  },
  {
    q: "What format is the report delivered in?",
    a: "Reports are delivered as a professionally formatted PDF, typically 10–12 pages. You receive an instant download link after payment is confirmed via Stripe.",
  },
  {
    q: "Can I use the report in a DA submission?",
    a: "Yes. The reports are formatted with ABS source citations and data tables suitable for inclusion in Development Application documentation. Many planners include the PDF as an appendix to their community needs analysis.",
  },
  {
    q: "What is SA2 geography?",
    a: "SA2 (Statistical Area Level 2) is the ABS geography that most closely corresponds to a suburb. Each SA2 has a population of roughly 3,000–25,000 people. Some postcodes span multiple SA2s — in that case we show all matching SA2s.",
  },
  {
    q: "Do you cover states other than NSW and VIC?",
    a: "NSW and Victoria are covered in the current version. Queensland, SA, WA, and ACT are on the roadmap. Sign up to be notified when your state is added.",
  },
  {
    q: "Is my payment secure?",
    a: "Payments are processed by Stripe, a PCI-DSS Level 1 certified payment provider. We never store your card details. You pay once and get instant download access.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="font-medium text-gray-900 text-sm sm:text-base">{q}</span>
        <svg
          className={["w-5 h-5 flex-shrink-0 text-brand-500 transition-transform", open ? "rotate-180" : ""].join(" ")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-5 text-sm text-gray-500 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Common questions</h2>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-6">
          {FAQS.map((item) => (
            <FAQItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
