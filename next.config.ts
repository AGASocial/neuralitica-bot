import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // For MVP development, we'll be less strict about linting errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // For MVP development, we'll ignore TypeScript errors during builds
    ignoreBuildErrors: false, // Keep this false to catch real type errors
  },
};

export default nextConfig;
