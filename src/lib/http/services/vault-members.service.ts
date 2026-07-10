import { HTTPException } from "hono/http-exception";
import { id } from "@instantdb/admin";
import { createAdminDb } from "@/lib/db-admin";

const MANAGER_ROLES = new Set(["owner", "admin"]);

/** Ensure `userId` is an owner/admin of `vaultId`; returns the vault's members. */
async function assertManager(userId: string, vaultId: string) {
  const db = createAdminDb();
  const { vaultMembers } = await db.query({
    vaultMembers: { $: { where: { "vault.id": vaultId } }, member: { $user: {} } },
  });
  const mine = (vaultMembers ?? []).find((m) => m.member?.$user?.id === userId);
  if (!mine || !MANAGER_ROLES.has(mine.role)) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return { db, members: vaultMembers ?? [] };
}

export async function addMember(
  userId: string,
  input: { vaultId: string; memberProfileId: string; role: "moderator" | "member"; encryptedVaultKey: string },
) {
  const { db, members } = await assertManager(userId, input.vaultId);
  if (members.some((m) => m.member?.id === input.memberProfileId)) {
    throw new HTTPException(409, { message: "Already a member" });
  }
  await db.transact(
    db.tx.vaultMembers[id()]
      .update({ role: input.role, encryptedVaultKey: input.encryptedVaultKey, createdAt: Date.now() })
      .link({ vault: input.vaultId, member: input.memberProfileId }),
  );
  return { ok: true };
}

export async function removeMember(userId: string, memberRowId: string) {
  const db = createAdminDb();
  const { vaultMembers } = await db.query({
    vaultMembers: { $: { where: { id: memberRowId } }, vault: {} },
  });
  const row = vaultMembers?.[0];
  if (!row?.vault) throw new HTTPException(404, { message: "Not found" });
  if (row.role === "owner") throw new HTTPException(400, { message: "Cannot remove the owner" });
  await assertManager(userId, row.vault.id);
  await db.transact(db.tx.vaultMembers[memberRowId].delete());
  return { ok: true };
}
