import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const dist = join(root, "dist");
const testDist = join(root, "dist-tests");

await rm(dist, { force: true, recursive: true });
await rm(testDist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });
await mkdir(join(dist, "background"), { recursive: true });
await mkdir(join(dist, "popup"), { recursive: true });
await mkdir(join(dist, "options"), { recursive: true });
await mkdir(join(dist, "shared"), { recursive: true });
await mkdir(testDist, { recursive: true });

await Promise.all([
  copyFile(join(root, "public", "manifest.json"), join(dist, "manifest.json")),
  copyFile(join(root, "public", "popup.html"), join(dist, "popup.html")),
  copyFile(join(root, "public", "options.html"), join(dist, "options.html")),
  copyFile(join(root, "public", "blocked.html"), join(dist, "blocked.html")),
  copyFile(join(root, "public", "styles.css"), join(dist, "styles.css")),
  copyFile(join(root, "public", "icon.svg"), join(dist, "icon.svg"))
]);

await build({
  entryPoints: {
    "background/service-worker": join(root, "src", "background", "service-worker.ts"),
    "popup/popup": join(root, "src", "popup", "popup.ts"),
    "options/options": join(root, "src", "options", "options.ts")
  },
  bundle: true,
  entryNames: "[dir]/[name]",
  format: "iife",
  outdir: dist,
  platform: "browser",
  sourcemap: true,
  target: ["firefox115"],
  logLevel: "info"
});

await build({
  entryPoints: [join(root, "tests", "rules.test.ts")],
  bundle: true,
  format: "esm",
  outfile: join(testDist, "rules.test.mjs"),
  platform: "node",
  target: ["node20"],
  logLevel: "info"
});
