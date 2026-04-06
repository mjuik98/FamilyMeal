import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const isPwaEnabled = process.env.NEXT_PUBLIC_ENABLE_PWA === "true";
const nextBinary = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next"
);
const nextArgs = isPwaEnabled ? ["build", "--webpack"] : ["build"];

if (isPwaEnabled) {
  console.log("PWA build path enabled: using webpack for service worker generation.");
}

await new Promise((resolve, reject) => {
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `${nextBinary} ${nextArgs.join(" ")}`], {
          cwd: projectRoot,
          env: process.env,
          stdio: "inherit",
        })
      : spawn(nextBinary, nextArgs, {
          cwd: projectRoot,
          env: process.env,
          stdio: "inherit",
        });

  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`Next build failed with exit code ${code ?? "unknown"}`));
  });
});
