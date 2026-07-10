import { HTTPException } from "hono/http-exception";
import { id } from "@instantdb/admin";
import { createAdminDb } from "../db-admin";

interface CreateEntryInput {
  title: string;
  websiteUrl?: string;
  username?: string;
  encryptedPassword: string;
  passwordNonce: string;
  ownerEncryptedKey: string;
  encryptedOtpSeed?: string;
  otpNonce?: string;
  notes?: string;
}

/** Create a password entry owned by the caller (used by the extension). Content
 *  is ciphertext produced client-side under a fresh per-entry key. */
export async function createPasswordEntry(userId: string, input: CreateEntryInput) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.id": userId } } },
  });
  const profile = profiles?.[0];
  if (!profile) throw new HTTPException(400, { message: "Profile not set up" });

  const entryId = id();
  const now = Date.now();
  await db.transact(
    db.tx.passwordEntries[entryId]
      .update({
        title: input.title,
        websiteUrl: input.websiteUrl,
        username: input.username,
        encryptedPassword: input.encryptedPassword,
        passwordNonce: input.passwordNonce,
        ownerEncryptedKey: input.ownerEncryptedKey,
        encryptedOtpSeed: input.encryptedOtpSeed,
        otpNonce: input.otpNonce,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      })
      .link({ owner: profile.id }),
  );
  return { ok: true, entryId };
}

// A `has: one` nested link may come back as an object or a single-element array
// depending on the SDK; normalize to the single element.
function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

export interface ExtensionPassword {
  id: string;
  title: string;
  website_url: string | null;
  username: string | null;
  encrypted_password: string;
  password_nonce: string;
  encrypted_otp_seed: string | null;
  otp_nonce: string | null;
  notes: string | null;
  sealed_key: string; // entry key sealed to THIS user's public key
  shared: boolean;
  created_at: number | string;
}

/**
 * Password entries available to a user for the extension: entries they own plus
 * entries shared with them. Each carries the entry key sealed to this user's
 * public key (`sealed_key`) so the extension can unseal + decrypt locally.
 */
export async function listPasswordsForUser(userId: string): Promise<ExtensionPassword[]> {
  const db = createAdminDb();

  const [owned, received] = await Promise.all([
    db.query({
      passwordEntries: {
        $: { where: { "owner.$user.id": userId }, order: { createdAt: "desc" } },
      },
    }),
    db.query({
      passwordShares: {
        $: { where: { "recipient.$user.id": userId } },
        entry: {},
      },
    }),
  ]);

  const ownedList: ExtensionPassword[] = (owned.passwordEntries ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    website_url: p.websiteUrl ?? null,
    username: p.username ?? null,
    encrypted_password: p.encryptedPassword,
    password_nonce: p.passwordNonce,
    encrypted_otp_seed: p.encryptedOtpSeed ?? null,
    otp_nonce: p.otpNonce ?? null,
    notes: p.notes ?? null,
    sealed_key: p.ownerEncryptedKey,
    shared: false,
    created_at: p.createdAt,
  }));

  const sharedList: ExtensionPassword[] = (received.passwordShares ?? [])
    .map((s) => ({ share: s, entry: firstOf(s.entry) }))
    .filter((x) => x.entry)
    .map(({ share, entry }) => ({
      id: entry!.id,
      title: entry!.title,
      website_url: entry!.websiteUrl ?? null,
      username: entry!.username ?? null,
      encrypted_password: entry!.encryptedPassword,
      password_nonce: entry!.passwordNonce,
      encrypted_otp_seed: entry!.encryptedOtpSeed ?? null,
      otp_nonce: entry!.otpNonce ?? null,
      notes: entry!.notes ?? null,
      sealed_key: share.encryptedKey,
      shared: true,
      created_at: share.createdAt,
    }));

  return [...ownedList, ...sharedList];
}
