import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.*"],
};

export default nextConfig;
