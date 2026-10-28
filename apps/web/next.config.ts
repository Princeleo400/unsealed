import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@unsealed/engine'],
  // Case solutions are bundled into server code only. Never import them from a client component.
  poweredByHeader: false,
  // Fonts read from disk by the share-card image route.
  outputFileTracingIncludes: { '/s/[token]/card.png': ['./assets/fonts/**'] },
  // Basic protection for every page. (No Content-Security-Policy yet: the ad and payment
  // scripts need a tested allow-list first.)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
