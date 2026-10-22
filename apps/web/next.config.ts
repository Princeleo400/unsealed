import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@unsealed/engine'],
  // Case solutions are bundled into server code only. Never import them from a client component.
  poweredByHeader: false,
};

export default nextConfig;
