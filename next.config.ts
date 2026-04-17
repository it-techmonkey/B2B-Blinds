import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let Node load real `ws` + optional addons; bundling them breaks bufferutil.mask (Neon Prisma adapter).
  serverExternalPackages: [
    "ws",
    "bufferutil",
    "utf-8-validate",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
    // Bundled pdfkit breaks AFM font resolution in route handlers; load from node_modules.
    "pdfkit",
  ],
};

export default nextConfig;
