'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('MAXLITH Root Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080B10] flex flex-col items-center justify-center p-6 text-center font-mono text-[#F4F7FA]">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        System Runtime Exception
      </h2>

      <p className="text-xs text-[#94A3B8] max-w-md mb-6 leading-relaxed">
        An unexpected application error occurred. You can attempt to refresh the terminal view or return to the terminal overview.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2.5 rounded-lg bg-[#7C6FF2] hover:bg-[#6A5AE0] text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(124,111,242,0.25)] flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Application</span>
        </button>

        <Link
          href="/"
          className="px-4 py-2.5 rounded-lg bg-[#111720] hover:bg-[#1C2533] text-slate-300 text-xs font-semibold border border-[#1C2533] transition-colors"
        >
          Terminal Overview
        </Link>
      </div>
    </div>
  );
}
