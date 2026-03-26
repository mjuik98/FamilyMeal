import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminDb } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";

const host = process.env.SMOKE_HOST || "127.0.0.1";
const explicitPort = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : null;
const envPath = process.env.SMOKE_ENV_PATH || ".env.local";
const cwd = process.cwd();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const must = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readEnvFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
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
      // server not ready yet
    }
    await wait(500);
  }
  throw new Error(`Meal smoke timeout: server did not respond at ${url}`);
};

const createAdminContext = () => {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .replace(/^"|"$/g, "");

  must(projectId, "FIREBASE_ADMIN_PROJECT_ID is required for meal smoke test");
  must(clientEmail, "FIREBASE_ADMIN_CLIENT_EMAIL is required for meal smoke test");
  must(privateKey, "FIREBASE_ADMIN_PRIVATE_KEY is required for meal smoke test");

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });

  return {
    adminAuth: getAdminAuth(app),
    adminDb: getAdminDb(app),
  };
};

const createClientToken = async (adminAuth, adminDb) => {
  const allowlistedEmail = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  must(allowlistedEmail, "ALLOWED_EMAILS must include at least one address for meal smoke test");

  const authUser = await adminAuth.getUserByEmail(allowlistedEmail);
  const uid = authUser.uid;

  await adminDb.collection("users").doc(uid).set(
    {
      uid,
      email: allowlistedEmail,
      displayName: authUser.displayName || "Meal Smoke User",
      role: "아빠",
      notificationPreferences: {
        browserEnabled: true,
        commentAlerts: true,
        reactionAlerts: true,
        replyAlerts: true,
      },
    },
    { merge: true }
  );

  return {
    uid,
    customToken: await adminAuth.createCustomToken(uid),
  };
};

const createIdToken = async (customToken) => {
  const clientApp = initializeClientApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    `meal-smoke-client-${Date.now()}`
  );

  const auth = getAuth(clientApp);
  await signInWithCustomToken(auth, customToken);
  must(auth.currentUser, "Expected Firebase client user during meal smoke test");
  return auth.currentUser.getIdToken();
};

const uploadTinyImage = async (baseUrl, idToken) => {
  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p2Yb2QAAAAASUVORK5CYII=";

  const response = await fetch(`${baseUrl}/api/uploads/meal-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageData: tinyPng }),
  });
  const payload = await response.json();
  must(response.ok, `Image upload failed: ${payload?.error || response.status}`);
  must(typeof payload.imageUrl === "string", "Upload route did not return imageUrl");
  return payload.imageUrl;
};

const createMeal = async (baseUrl, idToken, imageUrl) => {
  const response = await fetch(`${baseUrl}/api/meals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userIds: ["아빠"],
      description: `meal smoke create ${Date.now()}`,
      type: "점심",
      imageUrl,
      timestamp: Date.now(),
    }),
  });
  const payload = await response.json();
  must(response.ok, `Meal create failed: ${payload?.error || response.status}`);
  must(typeof payload?.meal?.id === "string", "Meal create route did not return meal id");
  return payload.meal;
};

const updateMeal = async (baseUrl, idToken, mealId) => {
  const nextImageUrl = await uploadTinyImage(baseUrl, idToken);
  const response = await fetch(`${baseUrl}/api/meals/${encodeURIComponent(mealId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: `meal smoke update ${Date.now()}`,
      type: "저녁",
      userIds: ["아빠", "엄마"],
      imageUrl: nextImageUrl,
    }),
  });
  const payload = await response.json();
  must(response.ok, `Meal update failed: ${payload?.error || response.status}`);
  must(payload?.meal?.type === "저녁", "Meal update did not persist next type");
  must(Array.isArray(payload?.meal?.userIds) && payload.meal.userIds.length === 2, "Meal update did not persist next participants");
};

const deleteMeal = async (baseUrl, idToken, mealId) => {
  const response = await fetch(`${baseUrl}/api/meals/${encodeURIComponent(mealId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const payload = await response.json();
  must(response.ok, `Meal delete failed: ${payload?.error || response.status}`);
};

const run = async () => {
  readEnvFile(`${cwd}/${envPath}`);

  const port = await resolvePort();
  const baseUrl = `http://${host}:${port}`;
  const server =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run dev -- --hostname ${host} --port ${port}`], {
          stdio: "inherit",
          env: process.env,
          cwd,
        })
      : spawn("npm", ["run", "dev", "--", "--hostname", host, "--port", String(port)], {
          stdio: "inherit",
          env: process.env,
          cwd,
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

  let createdMealId = null;

  try {
    await waitForServer(`${baseUrl}/`);
    const { adminAuth, adminDb } = createAdminContext();
    const { customToken } = await createClientToken(adminAuth, adminDb);
    const idToken = await createIdToken(customToken);

    const imageUrl = await uploadTinyImage(baseUrl, idToken);
    const createdMeal = await createMeal(baseUrl, idToken, imageUrl);
    createdMealId = createdMeal.id;
    await updateMeal(baseUrl, idToken, createdMealId);
    await deleteMeal(baseUrl, idToken, createdMealId);
    createdMealId = null;
    console.log("Meal mutation smoke test passed");
  } finally {
    if (createdMealId) {
      try {
        const { adminDb } = createAdminContext();
        await adminDb.collection("meals").doc(createdMealId).delete();
      } catch {
        // Best effort cleanup.
      }
    }
    cleanup();
  }
};

await run();
