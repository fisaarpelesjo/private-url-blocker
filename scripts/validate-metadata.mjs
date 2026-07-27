import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "public", "manifest.json"), "utf8"));

const errors = [];

expectEqual(packageJson.name, "private-url-blocker", "package.json name");
expectEqual(manifest.name, "Private URL Blocker", "manifest name");
expectEqual(packageJson.version, manifest.version, "package.json version and manifest version");
expectEqual(manifest.browser_specific_settings?.gecko?.id, "private-url-blocker@local", "Firefox extension ID");
expectIncludes(manifest.permissions, "storage", "storage permission");
expectIncludes(manifest.permissions, "activeTab", "activeTab permission");
expectNotIncludes(manifest.permissions, "tabs", "tabs permission");
expectEqual(
  manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required?.[0],
  "none",
  "data collection declaration"
);

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Metadata validation passed.");

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    errors.push(`${label}: expected ${JSON.stringify(expected)} to be present`);
  }
}

function expectNotIncludes(values, forbidden, label) {
  if (Array.isArray(values) && values.includes(forbidden)) {
    errors.push(`${label}: ${JSON.stringify(forbidden)} must not be present`);
  }
}
