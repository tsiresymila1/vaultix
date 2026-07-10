"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { db } from "@/lib/db";
import type { AuthUser, Profile, UserSettings } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  userData: Profile | null;
  loading: boolean;
  // Crypto session (never touches the server)
  masterKey: Uint8Array | null;
  privateKey: string | null;
  vaultKeys: Record<string, string>;
  setKeys: (masterKey: Uint8Array, privateKey: string) => void;
  setVaultKey: (vaultId: string, key: string) => void;
  lock: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isLoading } = db.useAuth();

  // Live profile for the signed-in user.
  const { data: profileData } = db.useQuery(
    authUser
      ? { profiles: { $: { where: { "$user.id": authUser.id } } } }
      : null,
  );
  const userData = (profileData?.profiles?.[0] as Profile | undefined) ?? null;

  const user: AuthUser | null = authUser
    ? { id: authUser.id, email: authUser.email ?? "" }
    : null;

  // Crypto session state, persisted to localStorage so a single master-password
  // entry survives browser restarts and is shared across tabs. The exposure is
  // bounded by the inactivity auto-lock below and by manual lock / sign-out.
  const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedMK = localStorage.getItem("vx_mk");
      if (!savedMK) return null;
      return new Uint8Array(
        atob(savedMK)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );
    } catch {
      return null;
    }
  });
  const [privateKey, setPrivateKeyState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("vx_pk");
  });
  const [vaultKeys, setVaultKeys] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const savedVK = localStorage.getItem("vx_vk");
      return savedVK ? JSON.parse(savedVK) : {};
    } catch {
      return {};
    }
  });

  const setKeys = (mk: Uint8Array, pk: string) => {
    setMasterKeyState(mk);
    setPrivateKeyState(pk);
    try {
      const b64MK = btoa(String.fromCharCode(...Array.from(mk)));
      localStorage.setItem("vx_mk", b64MK);
      localStorage.setItem("vx_pk", pk);
    } catch (err) {
      console.error("Failed to save session keys", err);
    }
  };

  const setVaultKey = (vaultId: string, key: string) => {
    setVaultKeys((prev) => {
      const next = { ...prev, [vaultId]: key };
      try {
        localStorage.setItem("vx_vk", JSON.stringify(next));
      } catch (err) {
        console.error("Failed to save vault keys", err);
      }
      return next;
    });
  };

  // Lock: wipe the crypto session (forces master-password re-entry) but keep the
  // auth session alive. VaultUnlock reappears because masterKey is now null.
  const lock = useCallback(() => {
    setMasterKeyState(null);
    setPrivateKeyState(null);
    setVaultKeys({});
    try {
      localStorage.removeItem("vx_mk");
      localStorage.removeItem("vx_pk");
      localStorage.removeItem("vx_vk");
    } catch {
      // ignore
    }
  }, []);

  // Auto-lock after a period of inactivity, per the user's settings.
  const settings = userData?.settings as UserSettings | undefined;
  const autoLock = settings?.auto_lock ?? false;
  const lockTimeoutMin = settings?.lock_timeout ?? 15;
  useEffect(() => {
    if (!autoLock || !masterKey) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, Math.max(1, lockTimeoutMin) * 60_000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [autoLock, lockTimeoutMin, masterKey, lock]);

  const signOut = async () => {
    setMasterKeyState(null);
    setPrivateKeyState(null);
    setVaultKeys({});
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      // ignore
    }
    await db.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading: isLoading,
        masterKey,
        privateKey,
        vaultKeys,
        setKeys,
        setVaultKey,
        lock,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
