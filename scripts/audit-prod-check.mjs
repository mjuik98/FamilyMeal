import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const allowlistPath = path.resolve(
  process.cwd(),
  process.env.AUDIT_ALLOWLIST_FILE || "security/audit-allowlist.json"
);

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isExpired = (value) => {
  if (!value) return false;
  const parsed = parseDate(value);
  if (!parsed) return true;
  return parsed.getTime() < Date.now();
};

const loadAllowlist = () => {
  if (!existsSync(allowlistPath)) {
    return {
      advisories: new Map(),
      packages: new Map(),
    };
  }

  const raw = readFileSync(allowlistPath, "utf8");
  const parsed = JSON.parse(raw);

  const advisories = new Map(
    Object.entries(parsed?.advisories ?? {}).map(([id, config]) => [String(id), config])
  );
  const packages = new Map(
    Object.entries(parsed?.packages ?? {}).map(([name, config]) => [String(name), config])
  );

  return { advisories, packages };
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

const toAdvisoryFinding = (packageName, detail, advisory) => ({
  advisoryId: String(advisory.source),
  advisoryPackage: String(advisory.name ?? packageName),
  packageName,
  range: typeof advisory.range === "string" ? advisory.range : "",
  severity: String(advisory.severity ?? detail.severity ?? ""),
  title: typeof advisory.title === "string" ? advisory.title : "",
});

const toPackageFinding = (packageName, detail) => ({
  packageName,
  severity: String(detail?.severity ?? ""),
  via: getViaSummary(detail?.via),
});

try {
  const report = runAudit();
  const vulnerabilities = report?.vulnerabilities ?? {};
  const allowlist = loadAllowlist();

  const advisoryFindingsMap = new Map();
  const packageFindingsMap = new Map();

  for (const [packageName, detail] of Object.entries(vulnerabilities)) {
    if (!isBlockingSeverity(String(detail?.severity ?? ""))) {
      continue;
    }

    const via = Array.isArray(detail?.via) ? detail.via : [];
    const advisoryVia = via.filter((entry) => entry && typeof entry === "object" && "source" in entry);

    if (advisoryVia.length === 0) {
      packageFindingsMap.set(packageName, toPackageFinding(packageName, detail));
      continue;
    }

    for (const advisory of advisoryVia) {
      const finding = toAdvisoryFinding(packageName, detail, advisory);
      if (!advisoryFindingsMap.has(finding.advisoryId)) {
        advisoryFindingsMap.set(finding.advisoryId, finding);
      }
    }
  }

  const advisoryFindings = [...advisoryFindingsMap.values()];
  const packageFindings = [...packageFindingsMap.values()];

  const blockedAdvisories = advisoryFindings.filter((finding) => {
    const entry = allowlist.advisories.get(finding.advisoryId);
    if (!entry) return true;
    if (isExpired(entry.expiresOn)) return true;
    if (entry.package && entry.package !== finding.advisoryPackage) return true;
    if (entry.range && finding.range && entry.range !== finding.range) return true;
    return false;
  });

  const blockedPackages = packageFindings.filter((finding) => {
    const entry = allowlist.packages.get(finding.packageName);
    if (!entry) return true;
    if (isExpired(entry.expiresOn)) return true;
    return false;
  });

  if (blockedAdvisories.length === 0 && blockedPackages.length === 0) {
    const advisoryCount = advisoryFindings.length;
    const packageCount = packageFindings.length;
    console.log(
      `audit:prod:check passed (${advisoryCount} advisory findings + ${packageCount} package findings allowlisted in ${path.relative(process.cwd(), allowlistPath)})`
    );
    process.exit(0);
  }

  console.error(
    `audit:prod:check failed (${blockedAdvisories.length} advisory findings, ${blockedPackages.length} package findings not allowlisted)`
  );

  if (blockedAdvisories.length > 0) {
    console.error("blocked advisories:");
    for (const finding of blockedAdvisories) {
      console.error(
        `- ${finding.advisoryId} (${finding.advisoryPackage}) [${finding.severity}]${finding.range ? ` range=${finding.range}` : ""}${finding.title ? ` title=${finding.title}` : ""}`
      );
    }
  }

  if (blockedPackages.length > 0) {
    console.error("blocked packages:");
    for (const finding of blockedPackages) {
      console.error(
        `- ${finding.packageName} [${finding.severity}]${finding.via ? ` via=${finding.via}` : ""}`
      );
    }
  }

  process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`audit:prod:check error: ${message}`);
  process.exit(1);
}