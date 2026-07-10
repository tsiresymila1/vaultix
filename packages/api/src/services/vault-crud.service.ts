import { HTTPException } from "hono/http-exception";
import { id } from "@instantdb/admin";
import { createAdminDb } from "../db-admin";
import { requireVaultManager, requireVaultOwner } from "./vault-auth";

const DEFAULT_ENVS = ["Development", "Staging", "Production"];

/** Create a vault owned by the caller: vault + owner membership (with the vault
 *  key sealed to the owner) + default environments, atomically. */
export async function createVault(
  userId: string,
  input: { name: string; encryptedVaultKey: string },
) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.id": userId } } },
  });
  const profile = profiles?.[0];
  if (!profile) throw new HTTPException(400, { message: "Profile not set up" });

  const vaultId = id();
  const now = Date.now();
  await db.transact([
    db.tx.vaults[vaultId].update({ name: input.name, createdAt: now }).link({ owner: profile.id }),
    db.tx.vaultMembers[id()]
      .update({ role: "owner", encryptedVaultKey: input.encryptedVaultKey, createdAt: now })
      .link({ vault: vaultId, member: profile.id }),
    ...DEFAULT_ENVS.map((name) =>
      db.tx.environments[id()].update({ name, createdAt: now }).link({ vault: vaultId }),
    ),
  ]);
  return { ok: true, vaultId };
}

/** Rename a vault (manager). */
export async function renameVault(userId: string, input: { vaultId: string; name: string }) {
  const { db } = await requireVaultManager(userId, input.vaultId);
  await db.transact(db.tx.vaults[input.vaultId].update({ name: input.name }));
  return { ok: true };
}

/** Delete a vault and everything under it (owner only). */
export async function deleteVault(userId: string, input: { vaultId: string }) {
  const { db } = await requireVaultOwner(userId, input.vaultId);
  const data = await db.query({
    vaults: {
      $: { where: { id: input.vaultId } },
      secrets: {},
      environments: {},
      members: {},
    },
  });
  const vault = data.vaults?.[0];
  if (!vault) throw new HTTPException(404, { message: "Vault not found" });
  const ops = [
    ...(vault.secrets ?? []).map((s) => db.tx.secrets[s.id].delete()),
    ...(vault.environments ?? []).map((e) => db.tx.environments[e.id].delete()),
    ...(vault.members ?? []).map((m) => db.tx.vaultMembers[m.id].delete()),
    db.tx.vaults[input.vaultId].delete(),
  ];
  await db.transact(ops);
  return { ok: true };
}

// --- Secrets (manager-only writes; content is ciphertext produced client-side) ---

export async function createSecret(
  userId: string,
  input: { vaultId: string; environmentId: string; key: string; encryptedPayload: string; nonce: string },
) {
  const { db } = await requireVaultManager(userId, input.vaultId);
  const secretId = id();
  await db.transact(
    db.tx.secrets[secretId]
      .update({ key: input.key, encryptedPayload: input.encryptedPayload, nonce: input.nonce, createdAt: Date.now() })
      .link({ vault: input.vaultId, environment: input.environmentId }),
  );
  return { ok: true, secretId };
}

export async function importSecrets(
  userId: string,
  input: {
    vaultId: string;
    environmentId: string;
    secrets: { key: string; encryptedPayload: string; nonce: string }[];
  },
) {
  const { db } = await requireVaultManager(userId, input.vaultId);
  const now = Date.now();
  await db.transact(
    input.secrets.map((s) =>
      db.tx.secrets[id()]
        .update({ key: s.key, encryptedPayload: s.encryptedPayload, nonce: s.nonce, createdAt: now })
        .link({ vault: input.vaultId, environment: input.environmentId }),
    ),
  );
  return { ok: true, count: input.secrets.length };
}

async function secretInfo(db: ReturnType<typeof createAdminDb>, secretId: string) {
  const { secrets } = await db.query({
    secrets: { $: { where: { id: secretId } }, vault: {}, environment: {} },
  });
  const s = secrets?.[0];
  if (!s?.vault) throw new HTTPException(404, { message: "Secret not found" });
  return { vaultId: s.vault.id, currentEnvId: s.environment?.id as string | undefined };
}

export async function updateSecret(
  userId: string,
  input: {
    secretId: string;
    key?: string;
    encryptedPayload?: string;
    nonce?: string;
    environmentId?: string;
  },
) {
  const probe = createAdminDb();
  const { vaultId, currentEnvId } = await secretInfo(probe, input.secretId);
  const { db } = await requireVaultManager(userId, vaultId);

  const patch: Record<string, string> = {};
  if (input.key !== undefined) patch.key = input.key;
  if (input.encryptedPayload !== undefined) patch.encryptedPayload = input.encryptedPayload;
  if (input.nonce !== undefined) patch.nonce = input.nonce;

  let tx = db.tx.secrets[input.secretId].update(patch);
  // Moving environments: unlink the current one first (has-one link isn't
  // reliably replaced by a bare link()).
  if (input.environmentId && input.environmentId !== currentEnvId) {
    if (currentEnvId) tx = tx.unlink({ environment: currentEnvId });
    tx = tx.link({ environment: input.environmentId });
  }
  await db.transact(tx);
  return { ok: true };
}

export async function deleteSecrets(
  userId: string,
  input: { vaultId: string; secretIds: string[] },
) {
  const { db } = await requireVaultManager(userId, input.vaultId);
  // Only delete secrets that actually belong to this vault.
  const { secrets } = await db.query({
    secrets: { $: { where: { "vault.id": input.vaultId } } },
  });
  const owned = new Set((secrets ?? []).map((s) => s.id));
  const toDelete = input.secretIds.filter((sid) => owned.has(sid));
  if (toDelete.length) {
    await db.transact(toDelete.map((sid) => db.tx.secrets[sid].delete()));
  }
  return { ok: true, deleted: toDelete.length };
}

// --- Environments (manager-only writes) ---

export async function createEnvironment(userId: string, input: { vaultId: string; name: string }) {
  const { db } = await requireVaultManager(userId, input.vaultId);
  const envId = id();
  await db.transact(
    db.tx.environments[envId].update({ name: input.name, createdAt: Date.now() }).link({ vault: input.vaultId }),
  );
  return { ok: true, environmentId: envId };
}

async function vaultIdOfEnv(db: ReturnType<typeof createAdminDb>, envId: string) {
  const { environments } = await db.query({
    environments: { $: { where: { id: envId } }, vault: {}, secrets: {} },
  });
  const e = environments?.[0];
  if (!e?.vault) throw new HTTPException(404, { message: "Environment not found" });
  return { vaultId: e.vault.id, secretIds: (e.secrets ?? []).map((s) => s.id) };
}

export async function renameEnvironment(userId: string, input: { environmentId: string; name: string }) {
  const probe = createAdminDb();
  const { vaultId } = await vaultIdOfEnv(probe, input.environmentId);
  const { db } = await requireVaultManager(userId, vaultId);
  await db.transact(db.tx.environments[input.environmentId].update({ name: input.name }));
  return { ok: true };
}

export async function deleteEnvironment(userId: string, input: { environmentId: string }) {
  const probe = createAdminDb();
  const { vaultId, secretIds } = await vaultIdOfEnv(probe, input.environmentId);
  const { db } = await requireVaultManager(userId, vaultId);
  await db.transact([
    ...secretIds.map((sid) => db.tx.secrets[sid].delete()),
    db.tx.environments[input.environmentId].delete(),
  ]);
  return { ok: true, deletedSecrets: secretIds.length };
}
