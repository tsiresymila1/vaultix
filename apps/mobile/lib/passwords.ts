import { useMemo } from "react";
import { api, bearer } from "./api";
import { unsealKey, decryptSecret, generateEntryKey, encryptSecret, sealKey } from "./crypto";
import { useAuth } from "./auth";
import { db } from "./instant";
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
  const { user, isLoading: authLoading } = db.useAuth();
  const { data: profileData, isLoading: profileLoading, error: profileError } = db.useQuery(
    session && user
      ? { profiles: { $: { where: { "$user.id": user.id } } } }
      : null,
  );
  const profileId = profileData?.profiles[0]?.id;

  const { data: ownedData, isLoading: ownedLoading, error: ownedError } = db.useQuery(
    profileId
      ? {
          passwordEntries: {
            $: { where: { "owner.id": profileId }, order: { createdAt: "desc" } },
          },
        }
      : null,
  );
  const { data: sharedData, isLoading: sharedLoading, error: sharedError } = db.useQuery(
    profileId
      ? {
          passwordShares: {
            $: { where: { "recipient.id": profileId }, order: { createdAt: "desc" } },
            entry: {},
          },
        }
      : null,
  );

  const entries = useMemo<PasswordEntry[]>(() => {
    const owned = (ownedData?.passwordEntries ?? []).map((entry) =>
      toPasswordEntry(entry, entry.ownerEncryptedKey, false),
    );
    const shared = (sharedData?.passwordShares ?? []).flatMap((share) => {
      const entry = Array.isArray(share.entry) ? share.entry[0] : share.entry;
      return entry ? [toPasswordEntry(entry, share.encryptedKey, true)] : [];
    });

    return [...owned, ...shared].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }, [ownedData?.passwordEntries, sharedData?.passwordShares]);

  const queryError = profileError ?? ownedError ?? sharedError;

  return {
    entries,
    loading: authLoading || profileLoading || (Boolean(profileId) && (ownedLoading || sharedLoading)),
    error: queryError instanceof Error ? queryError.message : queryError ? "Failed to load passwords" : null,
  };
}

function toPasswordEntry(
  entry: {
    id: string;
    title: string;
    websiteUrl?: string;
    username?: string;
    encryptedPassword: string;
    passwordNonce: string;
    encryptedOtpSeed?: string;
    otpNonce?: string;
    notes?: string;
    createdAt: number | string;
  },
  sealedKey: string,
  shared: boolean,
): PasswordEntry {
  return {
    id: entry.id,
    title: entry.title,
    website_url: entry.websiteUrl ?? null,
    username: entry.username ?? null,
    encrypted_password: entry.encryptedPassword,
    password_nonce: entry.passwordNonce,
    encrypted_otp_seed: entry.encryptedOtpSeed ?? null,
    otp_nonce: entry.otpNonce ?? null,
    notes: entry.notes ?? null,
    sealed_key: sealedKey,
    shared,
    created_at: entry.createdAt,
  };
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
