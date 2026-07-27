import { spawn } from "node:child_process";

const apkByChannel = {
  stable: "org.mozilla.firefox",
  beta: "org.mozilla.firefox_beta",
  nightly: "org.mozilla.fenix"
};

const channel = process.argv[2] ?? "stable";
const firefoxApk = apkByChannel[channel];

if (firefoxApk === undefined) {
  console.error("Canal invalido. Use: stable, beta ou nightly.");
  process.exit(1);
}

await run("npm", ["run", "build"]);

const adbAvailable = await commandSucceeds("adb", ["devices"]);
if (!adbAvailable) {
  console.error("");
  console.error("ADB nao foi encontrado no PATH.");
  console.error("Instale Android SDK Platform Tools e reinicie o terminal:");
  console.error("https://developer.android.com/tools/releases/platform-tools");
  console.error("");
  console.error("Depois conecte o celular por USB, ative Depuracao USB e rode de novo:");
  console.error("npm run mobile");
  process.exit(1);
}

await run("npx", [
  "web-ext",
  "run",
  "--target=firefox-android",
  "--source-dir=dist",
  `--firefox-apk=${firefoxApk}`
]);

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

      reject(new Error(`${command} ${args.join(" ")} saiu com codigo ${code ?? "desconhecido"}.`));
    });

    child.on("error", reject);
  });
}

function commandSucceeds(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: "ignore"
    });

    child.on("exit", (code) => {
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}
