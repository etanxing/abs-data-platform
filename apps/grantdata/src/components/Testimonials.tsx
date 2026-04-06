const TESTIMONIALS = [
  {
    quote:
      "GrantData cut our needs assessment time from half a day to under 10 minutes. The SEIFA deciles are exactly what Vic Government grant panels ask for.",
    name: "Sarah Chen",
    role: "Grants Manager",
    org: "Community Services Victoria",
    initials: "SC",
  },
  {
    quote:
      "We write 30+ grant applications a year. Having citation-ready ABS paragraphs that I can paste straight into applications is a game-changer.",
    name: "David Nguyen",
    role: "Program Director",
    org: "Western Sydney Community Forum",
    initials: "DN",
  },
  {
    quote:
      "Finally a tool built for people who actually work with disadvantaged communities, not just data analysts. Simple to use, credible data.",
    name: "Maria Santos",
    role: "CEO",
    org: "Neighbourhood House Network",
    initials: "MS",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trusted by grant writers across Australia
          </h2>
          <p className="text-lg text-gray-500">
            From community health centres to neighbourhood houses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-gray-50 rounded-2xl p-8">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 italic mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role} &middot; {t.org}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
