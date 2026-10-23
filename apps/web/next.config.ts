import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@unsealed/engine'],
  // Case solutions are bundled into server code only. Never import them from a client component.
  poweredByHeader: false,
  // Fonts read from disk by the share-card image route.
  outputFileTracingIncludes: { '/s/[token]/card.png': ['./assets/fonts/**'] },
};

export default nextConfig;
