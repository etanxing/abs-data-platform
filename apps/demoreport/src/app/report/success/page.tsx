"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { fetchReportStatus } from "@/lib/api";
import { Nav } from "@/components/Nav";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

interface ReportStatus {
  id: string;
  status: string;
  suburb: string;
  downloadUrl: string | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";

  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [polling, setPolling] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId || !polling) return;

    const interval = setInterval(async () => {
      const data = await fetchReportStatus(sessionId);
      setAttempts((a) => a + 1);

      if (data) {
        setStatus(data);
        if (data.status === "ready" || data.status === "error") {
          setPolling(false);
          clearInterval(interval);
        }
      }

      // Stop polling after 2 minutes
      if (attempts >= 24) {
        setPolling(false);
        clearInterval(interval);
      }
    }, 5000);

    // Poll immediately
    fetchReportStatus(sessionId).then((data) => {
      if (data) setStatus(data);
    });

    return () => clearInterval(interval);
  }, [sessionId, polling, attempts]);

  if (!sessionId) {
    return (
      <div className="text-center">
        <p className="text-gray-500">Invalid session. <Link href="/" className="text-brand-600 underline">Go home</Link></p>
      </div>
    );
  }

  const isReady = status?.status === "ready";
  const isError = status?.status === "error";

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Icon */}
      <div className={["w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
        isReady ? "bg-green-50" : isError ? "bg-red-50" : "bg-brand-50"
      ].join(" ")}>
        {isReady ? (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : isError ? (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {isReady ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your report is ready!</h1>
          <p className="text-gray-500 mb-2">
            Report for <strong>{status?.suburb}</strong> has been generated successfully.
          </p>
          <p className="text-xs text-gray-400 mb-6">Check your email for a download link as well.</p>

          {status?.downloadUrl && (
            <a
              href={`${API_URL}${status.downloadUrl}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
              download
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Report
            </a>
          )}
        </>
      ) : isError ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Generation failed</h1>
          <p className="text-gray-500 mb-6">
            Something went wrong generating your report. Please contact support — your payment has been recorded.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment confirmed!
          </h1>
          <p className="text-gray-500 mb-2">
            {status?.suburb
              ? `Generating your report for ${status.suburb}…`
              : "Generating your report…"}
          </p>
          <p className="text-xs text-gray-400">
            This usually takes 15–30 seconds. Don't close this page.
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Generate another report
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <Suspense fallback={<div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}>
          <SuccessContent />
        </Suspense>
      </div>
    </>
  );
}
