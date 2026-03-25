import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.google.com' },
      { protocol: 'https', hostname: 'openweathermap.org' },
      { protocol: 'https', hostname: 'wttr.in' },
    ],
  },
  // Allow iframes from any origin in dev
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
};

export default nextConfig;
