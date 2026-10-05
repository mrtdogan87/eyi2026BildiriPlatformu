import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // Access links carry secrets in their query; never log incoming request URLs in dev.
  logging: { incomingRequests: false },
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { '/api/platform/cms/eyi-import': ['data/eyi-2026/assets/**/*'] },
  turbopack: { root: process.cwd() },
  outputFileTracingExcludes: {
    "*": [".env*", ".local/**/*", ".preview/**/*", ".recovery/**/*", ".next/standalone/**/*", ".next/export-detail.json"],
  },
};

export default nextConfig;
