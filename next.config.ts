import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // P11 permits a 10 MB DOCX plus 2 MB evidence and multipart metadata.
  // Individual routes still enforce their own streamed/upload limits.
  experimental: { proxyClientMaxBodySize: '14mb' },
  // Access links carry secrets in their query; never log incoming request URLs in dev.
  logging: { incomingRequests: false },
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { '*': ['data/fonts/**/*', 'data/certificates/**/*'], '/api/platform/cms/eyi-import': ['data/eyi-2026/assets/**/*'] },
  turbopack: { root: process.cwd() },
  outputFileTracingExcludes: {
    "*": [".env*", ".local/**/*", ".preview/**/*", ".recovery/**/*", ".next/standalone/**/*", ".next/export-detail.json"],
  },
};

export default nextConfig;
