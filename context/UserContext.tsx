"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { UserProfile, UserRole } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { QA_MOCK_MODE_KEY, getQaDefaultRole, isQaMockMode } from "@/lib/qa";

type UserContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const createQaUser = (): User => ({ uid: "qa-user" } as User);

const createQaProfile = (role: UserRole = getQaDefaultRole()): UserProfile => ({
  uid: "qa-user",
  email: "qa@example.com",
  displayName: "QA User",
  role,
});

const getAccessToken = async (): Promise<string> => {
  const current = auth.currentUser;
  if (!current) {
    throw new Error("Not authenticated");
  }
  return current.getIdToken();
};

const parseErrorMessage = async (
  response: Response,
  fallback: string
): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {
    // Ignore JSON parse errors and use fallback.
  }
  return fallback;
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isQaMockMode()) {
        setUser(createQaUser());
        setUserProfile(createQaProfile());
        setAuthError(null);
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        setAuthError(null);

        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: null,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile", error);
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: null,
          });
          setAuthError(
            "\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
          );
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setAuthError(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isQaMockMode()) {
      setUser(createQaUser());
      setUserProfile(createQaProfile());
      setAuthError(null);
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setAuthError(null);

    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";

      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }

      if (code === "auth/unauthorized-domain") {
        setAuthError(
          "\uC774 \uB3C4\uBA54\uC778\uC740 Firebase Auth \uD5C8\uC6A9 \uB3C4\uBA54\uC778\uC5D0 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD574 \uC8FC\uC138\uC694."
        );
        return;
      }

      setAuthError(
        "Google \uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
      );
      console.error("Error signing in with Google", error);
    }
  };

  const signOut = async () => {
    if (typeof window !== "undefined" && isQaMockMode()) {
      window.localStorage.removeItem(QA_MOCK_MODE_KEY);
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
      setLoading(false);
      return;
    }

    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const selectRole = async (role: UserRole) => {
    if (isQaMockMode()) {
      setUserProfile((prev) => ({
        uid: prev?.uid ?? "qa-user",
        email: prev?.email ?? "qa@example.com",
        displayName: prev?.displayName ?? "QA User",
        role,
      }));
      return;
    }

    if (!user) return;

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/profile/role", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "역할 저장에 실패했습니다.");
        throw new Error(message);
      }

      const payload = (await response.json()) as { profile?: UserProfile };
      if (!payload.profile) {
        throw new Error("역할 저장 결과가 올바르지 않습니다.");
      }
      setUserProfile(payload.profile);
      setAuthError(null);
    } catch (error) {
      console.error("Error saving user role", error);
      setAuthError(
        error instanceof Error
          ? error.message
          : "역할 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
      throw error;
    }
  };

  const value: UserContextType = {
    user,
    userProfile,
    loading,
    authError,
    signInWithGoogle,
    signOut,
    selectRole,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
