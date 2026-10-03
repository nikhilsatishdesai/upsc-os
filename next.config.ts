import type { NextConfig } from "next";

/**
 * GitHub Pages build (`npm run build:pages`, used by the deploy workflow):
 * a fully static export served from a sub-path such as /upsc-os. Every
 * route is already static (no server code, no API routes), so the export
 * is the same app. Local dev and Vercel builds are unaffected.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Verification builds run in a separate folder (see "build:check" script)
  // so they never corrupt the running dev server's .next cache.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  ...(isPages && {
    output: "export",
    basePath,
    // /topic/ → topic/index.html: works on any static host, including
    // syllabus ids that contain dots (mains.psir1.concepts.justice).
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
