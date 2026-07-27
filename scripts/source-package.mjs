import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const artifactsDir = join(process.cwd(), "artifacts");
const manifest = JSON.parse(await readFile(join(process.cwd(), "public", "manifest.json"), "utf8"));
const version = String(manifest.version);
const outputFile = join(artifactsDir, `private_url_blocker-${version}-source.zip`);

await mkdir(artifactsDir, { recursive: true });
await run("git", ["archive", "--format=zip", `--output=${outputFile}`, "HEAD"]);

console.log(`Source package ready: ${outputFile}`);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });

    child.on("error", reject);
  });
}
