interface DataCardProps {
  label: string;
  value: string | null;
  sub?: string;
  accent?: boolean;
}

export function DataCard({ label, value, sub, accent = false }: DataCardProps) {
  return (
    <div
      className={[
        "rounded-xl border p-5",
        accent
          ? "border-brand-200 bg-brand-50"
          : "border-gray-200 bg-white",
      ].join(" ")}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={["text-2xl font-bold", accent ? "text-brand-700" : "text-gray-900"].join(" ")}>
        {value ?? <span className="text-gray-300 text-base">No data</span>}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
