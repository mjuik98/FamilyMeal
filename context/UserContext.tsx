"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const allowedEmailsEnv = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "";
                const allowedEmails = allowedEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

                if (allowedEmails.length > 0 && firebaseUser.email && !allowedEmails.includes(firebaseUser.email.toLowerCase())) {
                    await firebaseSignOut(auth);
                    setUser(null);
                    setUserProfile(null);
                    setAuthError("우리 가족으로 등록되지 않은 계정입니다. 가족에게 문의해주세요!");
                    setLoading(false);
                    return;
                }

                setUser(firebaseUser);
                setAuthError(null);

                // Fetch user profile from Firestore
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                try {
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data() as UserProfile);
                    } else {
                        // Profile doesn't exist yet (needs to select role)
                        setUserProfile({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            role: null
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user profile", error);
                    setUserProfile({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        role: null
                    });
                    setAuthError("로그인 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const selectRole = async (role: UserRole) => {
        if (!user) return;

        const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: role
        };

        try {
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setUserProfile(newProfile);
        } catch (error) {
            console.error("Error saving user role", error);
            throw error;
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        authError,
        signInWithGoogle,
        signOut,
        selectRole
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
