import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#080b10] text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                M
              </div>
              <span className="text-base font-bold text-white tracking-tight">MAXLITH</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Intelligent stock-market paper trading and AI-assisted financial market intelligence platform for Indian markets (NSE/BSE).
            </p>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><Link href="#features" className="hover:text-slate-200 transition-colors">Market Overview</Link></li>
              <li><Link href="#paper-trading" className="hover:text-slate-200 transition-colors">Paper Trading</Link></li>
              <li><Link href="#ai-ecosystem" className="hover:text-slate-200 transition-colors">AI Agents</Link></li>
              <li><Link href="#markets" className="hover:text-slate-200 transition-colors">Stock Analysis</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3">AI Ecosystem</h4>
            <ul className="space-y-2 font-mono text-[11px]">
              <li>TECH AGENT</li>
              <li>NEWS AGENT</li>
              <li>RISK AGENT</li>
              <li>FUNDAMENTAL AGENT</li>
              <li>INFO AGENT</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Legal & Compliance</h4>
            <p className="text-slate-500 leading-relaxed mb-2">
              MAXLITH V1 is strictly a PAPER TRADING platform. No real monetary transactions are executed. Market insights do not constitute investment advice.
            </p>
            <span className="font-mono text-[10px] text-blue-400">NSE / BSE Simulated Feed Active</span>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 font-mono text-[11px]">
            © {new Date().getFullYear()} MAXLITH Inc. All rights reserved.
          </p>
          <div className="flex gap-4 font-mono text-[11px]">
            <span className="text-slate-500">Security Standard: SHA-256</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-500">Environment: V1 PAPER</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
