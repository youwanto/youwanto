import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.24s.com',
      },
    ],
    unoptimized: true,
  },
  async redirects() {
    return [
      // Legacy PDP URL → canonical PDP URL
      { source: '/product/:slug', destination: '/products/:slug', permanent: true },
    ];
  },
};

export default nextConfig;
