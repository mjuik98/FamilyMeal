import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const allowlistPath = path.resolve(
  process.cwd(),
  process.env.AUDIT_ALLOWLIST_FILE || "security/audit-allowlist.json"
);

const loadAllowlist = () => {
  if (!existsSync(allowlistPath)) {
    return new Map();
  }

  const raw = readFileSync(allowlistPath, "utf8");
  const parsed = JSON.parse(raw);
  const entries = Object.entries(parsed?.packages ?? {});
  return new Map(entries.map(([name, reason]) => [String(name), String(reason)]));
};

const runAudit = () => {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  const output = `${result.stdout || ""}`.trim() || `${result.stderr || ""}`.trim();
  if (!output) {
    throw new Error("npm audit returned no output");
  }

  try {
    return JSON.parse(output);
  } catch {
    throw new Error("Failed to parse npm audit JSON output");
  }
};

const isBlockingSeverity = (severity) => severity === "high" || severity === "critical";

const getViaSummary = (via) => {
  if (!Array.isArray(via) || via.length === 0) return "";
  return via
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "name" in item) return String(item.name);
      return "unknown";
    })
    .join(", ");
};

try {
  const report = runAudit();
  const vulnerabilities = report?.vulnerabilities ?? {};
  const allowlist = loadAllowlist();

  const highOrCritical = Object.entries(vulnerabilities)
    .map(([name, detail]) => ({
      name,
      severity: String(detail?.severity ?? ""),
      via: getViaSummary(detail?.via),
    }))
    .filter((entry) => isBlockingSeverity(entry.severity));

  const blocked = highOrCritical.filter((entry) => !allowlist.has(entry.name));

  if (highOrCritical.length === 0) {
    console.log("audit:prod:check passed (no high/critical prod vulnerabilities)");
    process.exit(0);
  }

  if (blocked.length === 0) {
    console.log(
      `audit:prod:check passed (${highOrCritical.length} high/critical findings are allowlisted in ${path.relative(process.cwd(), allowlistPath)})`
    );
    process.exit(0);
  }

  console.error(`audit:prod:check failed (${blocked.length} non-allowlisted high/critical findings)`);
  for (const entry of blocked) {
    console.error(`- ${entry.name} [${entry.severity}]${entry.via ? ` via: ${entry.via}` : ""}`);
  }
  process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`audit:prod:check error: ${message}`);
  process.exit(1);
}
