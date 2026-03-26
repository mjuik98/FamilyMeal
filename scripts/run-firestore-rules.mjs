import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const existsExecutable = (targetPath) => {
  try {
    fs.accessSync(targetPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const findVersionedJavaHome = (baseDir, javaBinaryName) => {
  if (!baseDir || !fs.existsSync(baseDir)) {
    return null;
  }

  const candidates = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, "en"));

  for (const candidate of candidates) {
    const javaHome = path.join(baseDir, candidate);
    if (existsExecutable(path.join(javaHome, "bin", javaBinaryName))) {
      return javaHome;
    }
  }

  return null;
};

const detectJavaHome = () => {
  const javaBinaryName = process.platform === "win32" ? "java.exe" : "java";

  if (process.env.JAVA_HOME && existsExecutable(path.join(process.env.JAVA_HOME, "bin", javaBinaryName))) {
    return process.env.JAVA_HOME;
  }

  if (process.platform === "win32") {
    return findVersionedJavaHome(
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".local", "java-win") : "",
      javaBinaryName
    );
  }

  return findVersionedJavaHome(path.join(os.homedir(), ".local", "java"), javaBinaryName);
};

const env = { ...process.env };
const javaHome = detectJavaHome();
env.PATH = `${path.dirname(process.execPath)}${path.delimiter}${env.PATH ?? ""}`;

if (javaHome) {
  env.JAVA_HOME = javaHome;
  env.PATH = `${path.join(javaHome, "bin")}${path.delimiter}${env.PATH ?? ""}`;
}

const javaCheck = spawnSync(process.platform === "win32" ? "java.exe" : "java", ["-version"], {
  env,
  stdio: "ignore",
});

if (javaCheck.status !== 0) {
  console.error("Java runtime not found. Install a local JRE or set JAVA_HOME before running test:rules.");
  process.exit(javaCheck.status ?? 1);
}

const npmExecPath = process.env.npm_execpath;
const guessedNpxCliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const npxCliPath = npmExecPath
  ? path.join(path.dirname(npmExecPath), "npx-cli.js")
  : guessedNpxCliPath;
const rulesTestCommand = "node --test tests/firestore.rules.test.mjs";

const child = fs.existsSync(npxCliPath)
  ? spawn(
      process.execPath,
      [npxCliPath, "firebase-tools", "emulators:exec", "--only", "firestore", rulesTestCommand],
      {
        env,
        stdio: "inherit",
      }
    )
  : spawn(
      "npx",
      ["firebase-tools", "emulators:exec", "--only", "firestore", rulesTestCommand],
      {
        env,
        stdio: "inherit",
      }
    );

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("Failed to start Firestore rules test runner.", error);
  process.exit(1);
});
