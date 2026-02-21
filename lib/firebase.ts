import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim();
const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim();
const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "").trim();
const storageBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "").trim();
const messagingSenderId = (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "").trim();
const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "").trim();

const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
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
