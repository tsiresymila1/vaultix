import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { db } from "./instant";
import { api, bearer } from "./api";
import { deriveMasterKey, decryptPrivateKey } from "./crypto";
import { saveSession, loadSession, clearSession, type Session } from "./session";
import { UnlockDialog } from "@/components/unlock-dialog";
import { clearAutofill } from "./autofill";

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
  session: Session | null; // authenticated; pwPrivateKey is empty until requested
  pending: Pending | null; // authenticated, awaiting master password
  ready: boolean;
  sendCode: (email: string) => Promise<void>;
  /** Returns true if the account needs its vault set up on the web first. */
  verifyCode: (email: string, code: string) => Promise<{ needsSetup: boolean }>;
  unlock: (masterPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestUnlock: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);

  const [unlockVisible, setUnlockVisible] = useState(false);
  const epoch = useRef(0);
  const waiting = useRef<Array<(value: boolean) => void>>([]);
  const completeUnlock = (value: boolean) => { setUnlockVisible(false); waiting.current.splice(0).forEach(resolve => resolve(value)); };
  const requestUnlock = () => session?.pwPrivateKey ? Promise.resolve(true) : new Promise<boolean>(resolve => { waiting.current.push(resolve); setUnlockVisible(true); });

  useEffect(() => {
    clearAutofill();
    loadSession()
      .then(value => { setSession(value); if (value?.pwSalt && value.pwEncryptedPrivateKey && value.pwPrivateKeyNonce) setPending(value as Pending); })
      .catch(() => setSession(null))
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
      const authenticated: Session = { token: mint.token, email: u.email, pwPublicKey: u.pw_public_key ?? "", pwPrivateKey: "" };
      await saveSession(authenticated);
      setSession(authenticated);
      setPending(null);
      return { needsSetup: true };
    }
    const metadata: Pending = {
      token: mint.token,
      email: u.email,
      pwPublicKey: u.pw_public_key,
      pwEncryptedPrivateKey: u.pw_encrypted_private_key,
      pwPrivateKeyNonce: u.pw_private_key_nonce,
      pwSalt: u.pw_salt,
    };
    const authenticated: Session = { ...metadata, pwPrivateKey: "" };
    await saveSession(authenticated);
    setPending(metadata);
    setSession(authenticated);
    return { needsSetup: false };
  };

  const unlock = async (masterPassword: string) => {
    if (!pending) throw new Error("Configurez le coffre d’identifiants sur le web avant de le déverrouiller.");
    const generation = epoch.current;
    const response = await api.extension.me.$get({}, { headers: bearer(pending.token) });
    const body = await response.json();
    if (!response.ok || !("user" in body)) throw new Error("Reconnectez-vous pour actualiser votre coffre.");
    const user = body.user;
    if (!user.pw_salt || !user.pw_encrypted_private_key || !user.pw_private_key_nonce || !user.pw_public_key) throw new Error("Configurez votre coffre d’identifiants sur le web.");
    const material: Pending = { ...pending, pwSalt: user.pw_salt, pwEncryptedPrivateKey: user.pw_encrypted_private_key, pwPrivateKeyNonce: user.pw_private_key_nonce, pwPublicKey: user.pw_public_key };
    const masterKey = await deriveMasterKey(masterPassword, material.pwSalt);
    let pwPrivateKey: string;
    try {
      pwPrivateKey = await decryptPrivateKey(material.pwEncryptedPrivateKey, material.pwPrivateKeyNonce, masterKey);
    } finally { masterKey.fill(0); }
    if (epoch.current !== generation) throw new Error("Session terminée");
    const next: Session = { ...material, pwPrivateKey };
    await saveSession(next);
    if (epoch.current !== generation) return;
    setPending(material);
    setSession(next);
    completeUnlock(true);
  };

  const signOut = async () => {
    epoch.current++;
    completeUnlock(false);
    clearAutofill();
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
      value={{ session, pending, ready, sendCode, verifyCode, unlock, signOut, requestUnlock }}
    >
      {children}
      <UnlockDialog visible={unlockVisible} onCancel={() => completeUnlock(false)} onUnlock={unlock} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
