import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const nextDir = path.join(projectRoot, ".next");
const publicDir = path.join(projectRoot, "public");

const GENERATED_PWA_ASSET_PATTERNS = [
  /^sw\.js$/,
  /^workbox-.*\.js$/,
  /^swe-worker-.*\.js$/,
];

const isGeneratedPwaAsset = (entryName) =>
  GENERATED_PWA_ASSET_PATTERNS.some((pattern) => pattern.test(entryName));

await rm(nextDir, { recursive: true, force: true });

try {
  const publicEntries = await readdir(publicDir);
  await Promise.all(
    publicEntries
      .filter(isGeneratedPwaAsset)
      .map((entryName) => rm(path.join(publicDir, entryName), { force: true }))
  );
} catch {
  // Ignore cleanup failures for generated PWA assets.
}
