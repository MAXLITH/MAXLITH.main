import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center p-4 font-mono text-center">
      <h1 className="text-4xl font-bold mb-2 text-blue-400">404</h1>
      <h2 className="text-lg font-semibold mb-2">Page Not Found</h2>
      <p className="text-slate-400 text-xs mb-6 max-w-sm">
        The requested financial terminal view or instrument does not exist.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs text-white font-medium transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
