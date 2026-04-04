import {
  must,
  resolvePort,
  startNpmScript,
  waitForServer,
} from "./lib/smoke-server.mjs";

const host = process.env.SMOKE_HOST || "127.0.0.1";
const includeQaRoutes = process.env.SMOKE_INCLUDE_QA === "true";
const assertQaBlocked = process.env.SMOKE_ASSERT_QA_BLOCKED === "true";
const explicitPort = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : null;

const run = async () => {
  const port = await resolvePort({ host, explicitPort });
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

  const { cleanup, dispose } = startNpmScript({
    script: "start",
    args: ["-p", String(port), "-H", host],
    env: process.env,
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
    dispose();
    cleanup();
  }
};

await run();
