import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.BACKEND_API_URL || "http://127.0.0.1:3001"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
