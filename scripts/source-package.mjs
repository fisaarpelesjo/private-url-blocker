import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const artifactsDir = join(process.cwd(), "artifacts");
const outputFile = join(artifactsDir, "private_url_blocker-0.1.0-source.zip");

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
