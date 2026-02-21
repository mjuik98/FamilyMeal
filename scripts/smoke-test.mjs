import { spawn, spawnSync } from "node:child_process";

const port = Number(process.env.SMOKE_PORT || 3210);
const host = process.env.SMOKE_HOST || "127.0.0.1";
const baseUrl = `http://${host}:${port}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const must = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) {
        return;
      }
    } catch {
      // Server not ready yet.
    }
    await wait(500);
  }
  throw new Error(`Smoke test timeout: server did not respond at ${url}`);
}

async function assertPage(pathname) {
  const url = `${baseUrl}${pathname}`;
  const res = await fetch(url, { redirect: "manual" });
  const body = await res.text();

  must(res.status === 200, `Smoke failed: ${pathname} returned ${res.status}`);
  must(!body.includes("Application error"), `Smoke failed: ${pathname} contains Application error`);
  must(
    !body.includes("Missing required environment variable"),
    `Smoke failed: ${pathname} reports missing env vars`
  );
}

const server =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run start -- -p ${port} -H ${host}`], {
        stdio: "inherit",
        env: process.env,
      })
    : spawn("npm", ["run", "start", "--", "-p", String(port), "-H", host], {
        stdio: "inherit",
        env: process.env,
      });

const cleanup = () => {
  if (server.exitCode === null && !server.killed) {
    if (process.platform === "win32" && server.pid) {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    }
    server.kill("SIGTERM");
  }
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

try {
  await waitForServer(`${baseUrl}/`);
  await assertPage("/");
  await assertPage("/add");
  await assertPage("/qa/meal-card");
  console.log("Smoke test passed");
} finally {
  cleanup();
}
