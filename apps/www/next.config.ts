import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: "standalone",
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.*"],
};

export default nextConfig;
