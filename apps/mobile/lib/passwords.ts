import { useCallback, useEffect, useState } from "react";
import { api, bearer } from "./api";
import { unsealKey, decryptSecret, generateEntryKey, encryptSecret, sealKey } from "./crypto";
import { useAuth } from "./auth";
import type { Session } from "./session";

export interface PasswordEntry {
  id: string;
  title: string;
  website_url: string | null;
  username: string | null;
  encrypted_password: string;
  password_nonce: string;
  encrypted_otp_seed: string | null;
  otp_nonce: string | null;
  notes: string | null;
  sealed_key: string;
  shared: boolean;
  created_at: number | string;
}

/** Fetch the user's password entries (owned + shared) — content stays encrypted
 *  until you decrypt an entry on demand. */
export function usePasswords() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.extension.passwords.$get(
        {},
        { headers: bearer(session.token) },
      );
      const body = await res.json();
      if (!res.ok || !("passwords" in body)) throw new Error("Failed to load");
      setEntries(body.passwords as PasswordEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load passwords");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}

/** Create a new password entry: fresh entry key → encrypt content → seal the key
 *  to our own public key → POST. All crypto is on-device. */
export async function createPassword(
  session: Session,
  input: { title: string; websiteUrl?: string; username?: string; password: string; notes?: string },
): Promise<void> {
  const entryKey = await generateEntryKey();
  const { cipher, nonce } = await encryptSecret(input.password, entryKey);
  const ownerEncryptedKey = await sealKey(entryKey, session.pwPublicKey);

  const res = await api.passwords.$post(
    {
      json: {
        title: input.title,
        websiteUrl: input.websiteUrl || undefined,
        username: input.username || undefined,
        encryptedPassword: cipher,
        passwordNonce: nonce,
        ownerEncryptedKey,
        notes: input.notes || undefined,
      },
    },
    { headers: bearer(session.token) },
  );
  if (!res.ok) throw new Error("Failed to save");
}

/** Update an owned entry. If `newPassword` is given, it's re-encrypted with the
 *  entry's existing key (so existing shares keep working). */
export async function updatePassword(
  session: Session,
  entry: PasswordEntry,
  input: { title?: string; websiteUrl?: string; username?: string; notes?: string; newPassword?: string },
): Promise<void> {
  const json: {
    entryId: string;
    title?: string;
    websiteUrl?: string;
    username?: string;
    notes?: string;
    encryptedPassword?: string;
    passwordNonce?: string;
  } = { entryId: entry.id };
  if (input.title !== undefined) json.title = input.title;
  if (input.websiteUrl !== undefined) json.websiteUrl = input.websiteUrl;
  if (input.username !== undefined) json.username = input.username;
  if (input.notes !== undefined) json.notes = input.notes;

  if (input.newPassword) {
    const key = await unsealKey(entry.sealed_key, session.pwPublicKey, session.pwPrivateKey);
    const { cipher, nonce } = await encryptSecret(input.newPassword, key);
    json.encryptedPassword = cipher;
    json.passwordNonce = nonce;
  }

  const res = await api.passwords.$patch({ json }, { headers: bearer(session.token) });
  if (!res.ok) throw new Error("Failed to update");
}

/** Delete an owned entry (and its shares). */
export async function deletePassword(session: Session, entryId: string): Promise<void> {
  const res = await api.passwords.$delete({ json: { entryId } }, { headers: bearer(session.token) });
  if (!res.ok) throw new Error("Failed to delete");
}

/** Decrypt a single entry's password (unseal its key, then decrypt). */
export async function revealPassword(
  entry: PasswordEntry,
  publicKey: string,
  privateKey: string,
): Promise<string> {
  const key = await unsealKey(entry.sealed_key, publicKey, privateKey);
  return decryptSecret(entry.encrypted_password, entry.password_nonce, key);
}
