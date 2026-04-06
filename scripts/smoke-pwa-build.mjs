import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { must } from "./lib/smoke-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const GENERATED_PWA_ASSET_PATTERNS = [
  /^sw\.js$/,
  /^workbox-.*\.js$/,
  /^swe-worker-.*\.js$/,
];

const isGeneratedPwaAsset = (entryName) =>
  GENERATED_PWA_ASSET_PATTERNS.some((pattern) => pattern.test(entryName));

const listGeneratedPwaAssets = async () => {
  try {
    const entries = await readdir(publicDir);
    return entries.filter(isGeneratedPwaAsset).sort();
  } catch {
    return [];
  }
};

const runCommand = (command, args, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });

const runCleanup = async () => {
  await runCommand(process.execPath, ["scripts/clean-next-dir.mjs"]);
};

const runPwaBuild = async () => {
  const buildEnv = {
    ...process.env,
    NEXT_PUBLIC_ENABLE_PWA: "true",
  };

  if (process.platform === "win32") {
    await runCommand("cmd.exe", ["/d", "/s", "/c", "npm run build"], buildEnv);
    return;
  }

  await runCommand("npm", ["run", "build"], buildEnv);
};

const assertNoGeneratedPwaAssets = async (stageLabel) => {
  const assets = await listGeneratedPwaAssets();
  must(
    assets.length === 0,
    `PWA smoke failed: expected no generated PWA assets ${stageLabel}, found ${assets.join(", ")}`
  );
};

const assertGeneratedPwaAssets = async () => {
  const assets = await listGeneratedPwaAssets();
  must(assets.includes("sw.js"), `PWA smoke failed: sw.js was not generated (${assets.join(", ")})`);

  const helperAssets = assets.filter((asset) => asset !== "sw.js");
  must(
    helperAssets.length > 0,
    `PWA smoke failed: expected generated helper assets, found ${assets.join(", ")}`
  );
};

let buildCompleted = false;

try {
  await runCleanup();
  await assertNoGeneratedPwaAssets("before the build");
  await runPwaBuild();
  buildCompleted = true;
  await assertGeneratedPwaAssets();
  console.log("PWA smoke passed");
} finally {
  await runCleanup();
  await assertNoGeneratedPwaAssets(buildCompleted ? "after cleanup" : "after failed build cleanup");
}
