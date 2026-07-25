/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  // Prevents this site from being framed elsewhere (clickjacking protection)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevents MIME-sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Restricts powerful browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Forces HTTPS for a full year, including subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Controls what the browser is allowed to load — tightened since this app
  // handles financial data. Adjust 'connect-src' if you add more APIs.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is required in dev mode for Next.js Fast Refresh/HMR.
      // It is NOT included in production builds — isDev is false at build time.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co" + (isDev ? ' ws://localhost:*' : ''),
      "frame-ancestors 'none'",
    ].join('; '),
  },
  // Don't leak full referrer URLs (which could contain sensitive query params) cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
