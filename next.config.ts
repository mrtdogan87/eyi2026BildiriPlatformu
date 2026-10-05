import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  outputFileTracingExcludes: {
    "*": [".env*", ".local/**/*", ".preview/**/*", ".recovery/**/*", ".next/standalone/**/*", ".next/export-detail.json"],
  },
};

export default nextConfig;
