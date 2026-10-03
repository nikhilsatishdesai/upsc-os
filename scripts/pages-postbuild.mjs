/**
 * Post-processing for the GitHub Pages static export (`npm run build:pages`).
 *
 * Syllabus ids contain dots (e.g. mains.psir1.concepts.justice). Next.js'
 * client router treats a dotted last segment like a file name, so for
 * in-app navigation it fetches the page's RSC payload from
 * `syllabus/<id>.txt` instead of `syllabus/<id>/index.txt` (where the
 * trailing-slash export writes it). Without a copy at the dotted path every
 * click 404s and falls back to a full page reload. This mirrors each
 * dotted route's payload so navigation stays instant.
 */
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "out";
let mirrored = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory() || name === "_next") continue;
    const payload = join(full, "index.txt");
    if (name.includes(".") && existsSync(payload)) {
      copyFileSync(payload, `${full}.txt`);
      mirrored += 1;
    }
    walk(full);
  }
}

if (!existsSync(outDir)) {
  console.error(`pages-postbuild: "${outDir}" not found — run the Pages build first.`);
  process.exit(1);
}
walk(outDir);
console.log(`pages-postbuild: mirrored ${mirrored} route payload(s) for dotted paths.`);
