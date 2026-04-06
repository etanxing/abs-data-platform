import { Suspense } from "react";
import ReportContent from "./ReportContent";

// Static export: report preview is fully client-side via search params.
// URL shape: /report?suburb=Fitzroy  OR  /report?postcode=3065
export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
