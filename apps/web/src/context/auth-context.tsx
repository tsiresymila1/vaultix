"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/db";
import { api, bearer } from "@/lib/api";
import type { AuthUser, Profile } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  userData: Profile | null;
  loading: boolean;
  // Crypto session. The private key is fetched from the server after login
  // (server-held, wrapped by the app key) — no master password. Vault/entry
  // keys are unsealed client-side with it and cached.
  privateKey: string | null;
  publicKey: string | null;
  vaultKeys: Record<string, string>;
  setKeys: (privateKey: string, publicKey: string) => void;
  setVaultKey: (vaultId: string, key: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isLoading } = db.useAuth();

  const { data: profileData } = db.useQuery(
    authUser ? { profiles: { $: { where: { "$user.id": authUser.id } } } } : null,
  );
  const userData = (profileData?.profiles?.[0] as Profile | undefined) ?? null;

  const user: AuthUser | null = authUser
    ? { id: authUser.id, email: authUser.email ?? "" }
    : null;

  const [privateKey, setPrivateKeyState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("vx_pk"),
  );
  const [publicKey, setPublicKeyState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("vx_pubk"),
  );
  const [vaultKeys, setVaultKeys] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("vx_vk");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const setKeys = (pk: string, pubk: string) => {
    setPrivateKeyState(pk);
    setPublicKeyState(pubk);
    try {
      localStorage.setItem("vx_pk", pk);
      localStorage.setItem("vx_pubk", pubk);
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

  // Auto-fetch the private key from the server whenever authenticated without a
  // cached key (fresh login, cleared storage, another tab). No unlock step.
  useEffect(() => {
    if (isLoading || !authUser || privateKey) return;
    let cancelled = false;
    (async () => {
      try {
        const a = await db.getAuth();
        const res = await api.account.me.$get({}, { headers: bearer(a?.refresh_token) });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled && body.profile) setKeys(body.profile.privateKey, body.profile.publicKey);
      } catch {
        // ignore — pages that need keys handle the null case
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, authUser, privateKey]);

  const signOut = async () => {
    setPrivateKeyState(null);
    setPublicKeyState(null);
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
        privateKey,
        publicKey,
        vaultKeys,
        setKeys,
        setVaultKey,
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
