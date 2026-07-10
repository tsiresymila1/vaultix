import { HTTPException } from "hono/http-exception";
import { id } from "@instantdb/admin";
import { createAdminDb } from "../db-admin";
import { wrapKey, unwrapKey } from "../keyvault";
import type { AuthedUser } from "../types";

interface SetupInput {
  publicKey: string;
  privateKey: string; // raw, base64 — server wraps it under the app key
  fullName?: string;
}

/**
 * Create the caller's profile (registration). The server wraps the raw private
 * key under the app key at rest. Idempotent: existing profile is returned as-is.
 */
export async function setupProfile(user: AuthedUser, input: SetupInput) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.id": user.id } } },
  });
  const existing = profiles?.[0];
  if (existing) return { ok: true, created: false, profileId: existing.id };

  const profileId = id();
  await db.transact(
    db.tx.profiles[profileId]
      .update({
        publicKey: input.publicKey,
        encryptedPrivateKey: wrapKey(input.privateKey),
        fullName: input.fullName,
        role: "user",
        status: "active",
        createdAt: Date.now(),
      })
      .link({ $user: user.id }),
  );
  return { ok: true, created: true, profileId };
}

/** The caller's own keys: public key + the unwrapped raw private key. Returned
 *  after magic-code login so the client can decrypt vaults/passwords. */
export async function getMyKeys(user: AuthedUser) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.id": user.id } } },
  });
  const p = profiles?.[0];
  if (!p) return { profile: null };
  return {
    profile: {
      id: p.id,
      publicKey: p.publicKey,
      privateKey: unwrapKey(p.encryptedPrivateKey),
    },
  };
}

/** Permanently delete the user's app data and $users identity. */
export async function deleteAccount(user: AuthedUser) {
  const db = createAdminDb();
  const data = await db.query({
    profiles: { $: { where: { "$user.id": user.id } } },
    vaults: {
      $: { where: { "owner.$user.id": user.id } },
      environments: {},
      secrets: {},
      members: {},
    },
    vaultMembers: { $: { where: { "member.$user.id": user.id } } },
    passwordEntries: { $: { where: { "owner.$user.id": user.id } } },
    sharedSecrets: { $: { where: { "creator.$user.id": user.id } } },
    deletionRequests: { $: { where: { "requester.$user.id": user.id } } },
  });

  const ops = [];
  for (const v of data.vaults ?? []) {
    for (const s of v.secrets ?? []) ops.push(db.tx.secrets[s.id].delete());
    for (const e of v.environments ?? []) ops.push(db.tx.environments[e.id].delete());
    for (const m of v.members ?? []) ops.push(db.tx.vaultMembers[m.id].delete());
    ops.push(db.tx.vaults[v.id].delete());
  }
  for (const m of data.vaultMembers ?? []) ops.push(db.tx.vaultMembers[m.id].delete());
  for (const p of data.passwordEntries ?? []) ops.push(db.tx.passwordEntries[p.id].delete());
  for (const s of data.sharedSecrets ?? []) ops.push(db.tx.sharedSecrets[s.id].delete());
  for (const d of data.deletionRequests ?? []) ops.push(db.tx.deletionRequests[d.id].delete());
  for (const pr of data.profiles ?? []) ops.push(db.tx.profiles[pr.id].delete());

  if (ops.length) await db.transact(ops);
  if (user.email) await db.auth.deleteUser({ email: user.email });
  return { ok: true };
}

/** InstantDB identities are email-keyed and immutable; changing email is unsupported. */
export function changeEmail(): never {
  throw new HTTPException(501, {
    message:
      "Email changes aren't supported: your login identity is tied to this email. To use a different email, create a new account and re-share your vaults.",
  });
}
