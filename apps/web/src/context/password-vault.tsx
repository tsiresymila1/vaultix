"use client";

import React, { createContext, useContext, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

const SESSION_KEY = "vx_pwpk";

interface PasswordVaultContextType {
  // The password-vault public key comes from the profile (null until the user
  // sets a master password).
  pwPublicKey: string | null;
  // The password-vault private key, decrypted client-side with the master
  // password and cached in sessionStorage. Never leaves the browser.
  pwPrivateKey: string | null;
  // The user has never set up a password-vault master password.
  needsSetup: boolean;
  // The private key is available (vault is unlocked this session).
  unlocked: boolean;
  // First-time setup: mint a PW keypair, wrap its private key with the master
  // password, and persist the public parts to the profile.
  setup: (masterPassword: string) => Promise<void>;
  // Unlock an existing vault by re-deriving the master key. Throws on a wrong
  // password (libsodium fails to open the secretbox).
  unlock: (masterPassword: string) => Promise<void>;
  // Forget the private key (state + session).
  lock: () => void;
}

const PasswordVaultContext = createContext<PasswordVaultContextType | undefined>(
  undefined,
);

export function PasswordVaultProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData } = useAuth();

  const [pwPrivateKey, setPwPrivateKeyState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem(SESSION_KEY),
  );

  const pwPublicKey = userData?.pwPublicKey ?? null;
  const needsSetup = !userData?.pwPublicKey;
  const unlocked = pwPrivateKey != null;

  const cachePrivateKey = (pk: string) => {
    setPwPrivateKeyState(pk);
    try {
      sessionStorage.setItem(SESSION_KEY, pk);
    } catch (err) {
      console.error("Failed to cache password-vault key", err);
    }
  };

  const setup = async (masterPassword: string) => {
    if (!userData?.id) throw new Error("Not signed in.");
    const {
      generateSalt,
      deriveMasterKey,
      generateUserKeyPair,
      encryptPrivateKey,
      toBase64,
    } = await import("@/lib/crypto");

    const salt = await generateSalt();
    const masterKey = await deriveMasterKey(masterPassword, salt);
    // A dedicated password keypair — distinct from the identity keypair.
    const { publicKey: pwPub, privateKey: pwPriv } = await generateUserKeyPair();
    const { cipher, nonce } = await encryptPrivateKey(pwPriv, masterKey);

    await db.transact(
      db.tx.profiles[userData.id].update({
        pwPublicKey: pwPub,
        pwEncryptedPrivateKey: cipher,
        pwPrivateKeyNonce: nonce,
        pwSalt: await toBase64(salt),
      }),
    );

    cachePrivateKey(pwPriv);
  };

  const unlock = async (masterPassword: string) => {
    if (
      !userData?.pwSalt ||
      !userData?.pwEncryptedPrivateKey ||
      !userData?.pwPrivateKeyNonce
    ) {
      throw new Error("Password vault is not set up.");
    }
    const { deriveMasterKey, decryptPrivateKey, fromBase64 } = await import(
      "@/lib/crypto"
    );

    const masterKey = await deriveMasterKey(
      masterPassword,
      await fromBase64(userData.pwSalt),
    );
    // Throws if the derived key is wrong (secretbox open fails).
    const pwPriv = await decryptPrivateKey(
      userData.pwEncryptedPrivateKey,
      userData.pwPrivateKeyNonce,
      masterKey,
    );

    cachePrivateKey(pwPriv);
  };

  const lock = () => {
    setPwPrivateKeyState(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <PasswordVaultContext.Provider
      value={{
        pwPublicKey,
        pwPrivateKey,
        needsSetup,
        unlocked,
        setup,
        unlock,
        lock,
      }}
    >
      {children}
    </PasswordVaultContext.Provider>
  );
}

export function usePasswordVault() {
  const context = useContext(PasswordVaultContext);
  if (context === undefined) {
    throw new Error(
      "usePasswordVault must be used within a PasswordVaultProvider",
    );
  }
  return context;
}
