import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["libsodium-wrappers"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
};

export default nextConfig;
