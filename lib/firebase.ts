import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyDedBOyDx-NaeXvLKqteWrDMt56UD3fcxQ",
    authDomain: "family-meal-91736.firebaseapp.com",
    projectId: "family-meal-91736",
    storageBucket: "family-meal-91736.firebasestorage.app",
    messagingSenderId: "682548789102",
    appId: "1:682548789102:web:ac36870a20dd2d5ae80b7f"
};

// Initialize Firebase
// Avoid initializing twice in Next.js development (hot reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
