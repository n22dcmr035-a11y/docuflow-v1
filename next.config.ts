import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mammoth'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
            stream: false,
            buffer: false,
            crypto: false,
        };
    }
    return config;
  },
  turbopack: {} // silencing the turbopack warning
};

export default nextConfig;
