const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['better-sqlite3'],
  allowedDevOrigins: ['10.4.157.47', 'localhost:3000', '127.0.0.1:3000'],
  async rewrites() {
    return [
      { source: '/markets', destination: '/dashboard/markets' },
      { source: '/markets/:symbol', destination: '/dashboard/markets/:symbol' },
      { source: '/watchlist', destination: '/dashboard/watchlist' },
      { source: '/portfolio', destination: '/dashboard/portfolio' },
      { source: '/paper-trading', destination: '/dashboard/paper-trading' },
      { source: '/orders', destination: '/dashboard/orders' },
      { source: '/ai-copilot', destination: '/dashboard/ai-copilot' },
      { source: '/ai-agents', destination: '/dashboard/ai-agents' },
      { source: '/news', destination: '/dashboard/news' },
      { source: '/alerts', destination: '/dashboard/alerts' },
      { source: '/settings', destination: '/dashboard/settings' },
    ];
  },
};

module.exports = nextConfig;
