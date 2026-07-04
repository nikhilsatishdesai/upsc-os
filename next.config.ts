import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Verification builds run in a separate folder (see "build:check" script)
  // so they never corrupt the running dev server's .next cache.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
