"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import {
  clearQaRuntimeSession,
  getQaUserContextValue,
  isQaRuntimeActive,
  saveQaRuntimeNotificationPreferences,
  setQaRuntimeRole,
} from "@/lib/qa/runtime";
import { logError } from "@/lib/logging";
import { NotificationPreferences, UserProfile, UserRole } from "@/lib/types";
import { updateNotificationPreferences as saveNotificationPreferences } from "@/lib/client/activity";
import { buildFallbackUserProfile, loadUserProfile, saveUserRole } from "@/lib/client/profile-session";

type UserContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  updateNotificationPreferences: (
    preferences: NotificationPreferences
  ) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const authRequestSequenceRef = useRef(0);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const requestId = ++authRequestSequenceRef.current;
      if (isQaRuntimeActive()) {
        if (!active || requestId !== authRequestSequenceRef.current) {
          return;
        }
        const qaValue = getQaUserContextValue();
        setUser(qaValue.user);
        setUserProfile(qaValue.userProfile);
        setAuthError(null);
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        if (!active || requestId !== authRequestSequenceRef.current) {
          return;
        }
        setUser(firebaseUser);
        setAuthError(null);

        try {
          const nextProfile = await loadUserProfile(firebaseUser);
          if (!active || requestId !== authRequestSequenceRef.current) {
            return;
          }
          setUserProfile(nextProfile);
        } catch (error) {
          if (!active || requestId !== authRequestSequenceRef.current) {
            return;
          }
          logError("Error fetching user profile", error);
          setUserProfile(buildFallbackUserProfile(firebaseUser));
          setAuthError(
            "\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
          );
        }
      } else {
        if (!active || requestId !== authRequestSequenceRef.current) {
          return;
        }
        setUser(null);
        setUserProfile(null);
        setAuthError(null);
      }

      if (active && requestId === authRequestSequenceRef.current) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (isQaRuntimeActive()) {
      const qaValue = getQaUserContextValue();
      setUser(qaValue.user);
      setUserProfile(qaValue.userProfile);
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
      logError("Error signing in with Google", error);
    }
  };

  const signOut = async () => {
    if (isQaRuntimeActive()) {
      clearQaRuntimeSession();
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
      setLoading(false);
      return;
    }

    try {
      await firebaseSignOut(auth);
    } catch (error) {
      logError("Error signing out", error);
    }
  };

  const selectRole = async (role: UserRole) => {
    if (isQaRuntimeActive()) {
      setUserProfile((prev) => setQaRuntimeRole(role, prev));
      return;
    }

    if (!user) return;

    try {
      setUserProfile(await saveUserRole(role));
      setAuthError(null);
    } catch (error) {
      logError("Error saving user role", error);
      setAuthError(
        error instanceof Error
          ? error.message
          : "역할 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
      throw error;
    }
  };

  const updateNotificationPreferences = async (
    preferences: NotificationPreferences
  ) => {
    if (isQaRuntimeActive()) {
      setUserProfile((prev) =>
        saveQaRuntimeNotificationPreferences(preferences, prev)
      );
      return;
    }

    const savedPreferences = await saveNotificationPreferences(preferences);
    setUserProfile((prev) =>
      prev
        ? { ...prev, notificationPreferences: savedPreferences }
        : prev
    );
    setAuthError(null);
  };

  const value: UserContextType = {
    user,
    userProfile,
    loading,
    authError,
    signInWithGoogle,
    signOut,
    selectRole,
    updateNotificationPreferences,
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
