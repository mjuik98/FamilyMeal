import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const host = process.env.SMOKE_HOST || "127.0.0.1";
const includeQaRoutes = process.env.SMOKE_INCLUDE_QA === "true";
const assertQaBlocked = process.env.SMOKE_ASSERT_QA_BLOCKED === "true";
const explicitPort = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const must = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const resolvePort = async () => {
  if (typeof explicitPort === "number" && Number.isFinite(explicitPort) && explicitPort > 0) {
    return explicitPort;
  }

  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve random smoke port"));
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
};

const waitForServer = async (url, timeoutMs = 30_000) => {
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
};

const run = async () => {
  const port = await resolvePort();
  const baseUrl = `http://${host}:${port}`;

  const assertPage = async (pathname, expectedStatus = 200) => {
    const url = `${baseUrl}${pathname}`;
    const res = await fetch(url, { redirect: "manual" });
    const body = await res.text();

    must(
      res.status === expectedStatus,
      `Smoke failed: ${pathname} returned ${res.status} (expected ${expectedStatus})`
    );
    must(!body.includes("Application error"), `Smoke failed: ${pathname} contains Application error`);
    must(
      !body.includes("Missing required environment variable"),
      `Smoke failed: ${pathname} reports missing env vars`
    );
  };

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
    if (includeQaRoutes) {
      await assertPage("/qa/meal-card");
    }
    if (assertQaBlocked) {
      await assertPage("/qa/meal-card", 404);
    }
    console.log("Smoke test passed");
  } finally {
    cleanup();
  }
};

await run();
