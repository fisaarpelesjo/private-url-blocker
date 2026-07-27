import { rm } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const testDist = join(root, "dist-tests");

await rm(testDist, { force: true, recursive: true });

await build({
  entryPoints: [join(root, "tests", "rules.test.ts"), join(root, "tests", "storage.test.ts")],
  bundle: true,
  format: "esm",
  outdir: testDist,
  outExtension: { ".js": ".mjs" },
  platform: "node",
  target: ["node22"],
  logLevel: "info"
});
