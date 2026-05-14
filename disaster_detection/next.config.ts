import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/api/aws-image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, immutable',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/aws-image',
        destination: 'https://boedj5c60e.execute-api.us-east-2.amazonaws.com/default/getLocalImage',
      },
    ];
  },
};

export default nextConfig;
