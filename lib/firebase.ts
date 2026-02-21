import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { publicEnv } from "@/lib/env";

const firebaseConfig = {
    ...publicEnv.firebase,
};

const missingEnv = Object.entries(firebaseConfig)
    .filter(([, value]) => !value || value.trim().length === 0)
    .map(([key]) => key);

if (missingEnv.length > 0) {
    throw new Error(`[firebase] Missing required environment variable(s): ${missingEnv.join(", ")}`);
}

// Initialize Firebase
// Avoid initializing twice in Next.js development (hot reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
