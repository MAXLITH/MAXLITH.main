import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MAXLITH — Indian Stock Market AI Intelligence & Paper Trading',
  description: 'Intelligent paper trading, stock analysis, and multi-agent AI copilot for Indian stock markets (NSE/BSE).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0e14] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
