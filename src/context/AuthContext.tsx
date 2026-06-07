"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  role: "admin" | "voter" | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_EMAIL = "naikprathamesh782@gmail.com"; // 🔴 Replace with your email

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "voter" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
async function ensureUserDoc(u: User) {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        createdAt: new Date().toISOString(),
      });
    }
  }
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u: User | null) => {
      setUser(u);
      if (u) {
        await ensureUserDoc(u);
        setRole(u.email === ADMIN_EMAIL ? "admin" : "voter");
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    // Handle email link sign-in on page load
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem("emailForSignIn");
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => window.localStorage.removeItem("emailForSignIn"))
          .catch((e) => setError(e.message));
      }
    }

    return () => unsubscribe();
  }, []);

  

  async function signInWithGoogle() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }

  async function sendOTP(email: string) {
    setError(null);
    const actionCodeSettings = {
      url: window.location.origin + "/login",
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send email");
      throw e;
    }
  }

  async function verifyOTP() {
    // Handled in useEffect above on page load
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUser(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, sendOTP, verifyOTP, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}