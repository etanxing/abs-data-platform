interface LockedSectionProps {
  title: string;
  children: React.ReactNode;
  onUnlock: () => void;
  loading?: boolean;
}

export function LockedSection({ title, children, onUnlock, loading }: LockedSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Preview only</span>
      </div>
      <div className="relative">
        {/* Blurred content */}
        <div
          className="px-6 py-4 select-none pointer-events-none"
          style={{ filter: "blur(5px)", userSelect: "none" }}
          aria-hidden
        >
          {children}
        </div>

        {/* Unlock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
          <div className="text-center px-6">
            <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1">Full data included in report</p>
            <p className="text-xs text-gray-500 mb-4">Unlock the complete {title.toLowerCase()} section in the full PDF report.</p>
            <button
              onClick={onUnlock}
              disabled={loading}
              className="px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Redirecting…" : "Unlock Full Report — $99"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
