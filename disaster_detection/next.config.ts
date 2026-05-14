import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
