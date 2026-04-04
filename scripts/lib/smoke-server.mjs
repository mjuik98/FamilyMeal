import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const must = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const resolvePort = async ({ host, explicitPort }) => {
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

export const waitForServer = async (url, timeoutMs = 30_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await wait(500);
  }

  throw new Error(`Smoke test timeout: server did not respond at ${url}`);
};

const cleanupChildProcess = (child) => {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  child.kill("SIGTERM");
};

export const startNpmScript = ({ script, args = [], cwd = process.cwd(), env = process.env }) => {
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run ${script} -- ${args.join(" ")}`], {
          cwd,
          env,
          stdio: "inherit",
        })
      : spawn("npm", ["run", script, "--", ...args], {
          cwd,
          env,
          stdio: "inherit",
        });

  const cleanup = () => {
    cleanupChildProcess(child);
  };

  const handleSigInt = () => {
    cleanup();
    process.exit(130);
  };

  const handleSigTerm = () => {
    cleanup();
    process.exit(143);
  };

  process.on("SIGINT", handleSigInt);
  process.on("SIGTERM", handleSigTerm);

  return {
    child,
    cleanup,
    dispose: () => {
      process.off("SIGINT", handleSigInt);
      process.off("SIGTERM", handleSigTerm);
    },
  };
};
