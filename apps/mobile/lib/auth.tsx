import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "./instant";
import { api, bearer } from "./api";
import { deriveMasterKey, decryptPrivateKey } from "./crypto";
import { saveSession, loadSession, clearSession, type Session } from "./session";
import { clearCredentials } from "./autofill";

// The password vault is zero-knowledge: after magic-code login the server hands
// back the vault's ENCRYPTED private key + salt; the user enters their master
// password to unlock it locally.
interface Pending {
  token: string;
  email: string;
  pwPublicKey: string;
  pwEncryptedPrivateKey: string;
  pwPrivateKeyNonce: string;
  pwSalt: string;
}

interface AuthContextType {
  session: Session | null; // unlocked
  pending: Pending | null; // authenticated, awaiting master password
  ready: boolean;
  sendCode: (email: string) => Promise<void>;
  /** Returns true if the account needs its vault set up on the web first. */
  verifyCode: (email: string, code: string) => Promise<{ needsSetup: boolean }>;
  unlock: (masterPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .finally(() => setReady(true));
  }, []);

  const sendCode = async (email: string) => {
    await db.auth.sendMagicCode({ email });
  };

  const verifyCode = async (email: string, code: string) => {
    await db.auth.signInWithMagicCode({ email, code });
    const authUser = await db.getAuth();
    if (!authUser?.refresh_token) throw new Error("Sign-in failed");

    const mintRes = await api.auth.token.mint.$post({
      json: { instantToken: authUser.refresh_token },
    });
    const mint = await mintRes.json();
    if (!mintRes.ok || !("token" in mint)) throw new Error("Could not authorize");

    const meRes = await api.extension.me.$get({}, { headers: bearer(mint.token) });
    const me = await meRes.json();
    if (!meRes.ok || !("user" in me)) throw new Error("Could not load your account");

    const u = me.user;
    if (!u.pw_public_key || !u.pw_encrypted_private_key || !u.pw_private_key_nonce || !u.pw_salt) {
      // Vault not set up yet — needs a master password set on the web app.
      return { needsSetup: true };
    }
    setPending({
      token: mint.token,
      email: u.email,
      pwPublicKey: u.pw_public_key,
      pwEncryptedPrivateKey: u.pw_encrypted_private_key,
      pwPrivateKeyNonce: u.pw_private_key_nonce,
      pwSalt: u.pw_salt,
    });
    return { needsSetup: false };
  };

  const unlock = async (masterPassword: string) => {
    if (!pending) throw new Error("Nothing to unlock");
    const masterKey = await deriveMasterKey(masterPassword, pending.pwSalt);
    const pwPrivateKey = await decryptPrivateKey(
      pending.pwEncryptedPrivateKey,
      pending.pwPrivateKeyNonce,
      masterKey,
    );
    const next: Session = {
      token: pending.token,
      email: pending.email,
      pwPublicKey: pending.pwPublicKey,
      pwPrivateKey,
    };
    await saveSession(next);
    setSession(next);
    setPending(null);
  };

  const signOut = async () => {
    clearCredentials();
    await clearSession();
    setSession(null);
    setPending(null);
    try {
      await db.auth.signOut();
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, pending, ready, sendCode, verifyCode, unlock, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
