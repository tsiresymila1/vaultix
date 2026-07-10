import { HTTPException } from "hono/http-exception";
import { createAdminDb } from "../db-admin";

// Canonical vault role model: owner > admin > moderator > member.
// Managers (owner/admin/moderator) can manage members and read-write secrets +
// environments. A plain `member` is read-only.
export const MANAGER_ROLES = new Set(["owner", "admin", "moderator"]);

type Db = ReturnType<typeof createAdminDb>;

async function myMembership(db: Db, userId: string, vaultId: string) {
  const { vaultMembers } = await db.query({
    vaultMembers: { $: { where: { "vault.id": vaultId } }, member: { $user: {} } },
  });
  const mine = (vaultMembers ?? []).find((m) => m.member?.$user?.id === userId);
  return { mine, members: vaultMembers ?? [] };
}

/** Caller must be a manager (owner/admin/moderator) of the vault. */
export async function requireVaultManager(userId: string, vaultId: string) {
  const db = createAdminDb();
  const { mine, members } = await myMembership(db, userId, vaultId);
  if (!mine || !MANAGER_ROLES.has(mine.role)) {
    throw new HTTPException(403, { message: "You don't have permission to manage this vault" });
  }
  return { db, members, role: mine.role };
}

/** Caller must be the vault owner (destructive ops). */
export async function requireVaultOwner(userId: string, vaultId: string) {
  const db = createAdminDb();
  const { mine } = await myMembership(db, userId, vaultId);
  if (!mine || mine.role !== "owner") {
    throw new HTTPException(403, { message: "Only the vault owner can do this" });
  }
  return { db };
}

/** Caller must be any member of the vault (read access). */
export async function requireVaultMember(userId: string, vaultId: string) {
  const db = createAdminDb();
  const { mine } = await myMembership(db, userId, vaultId);
  if (!mine) throw new HTTPException(403, { message: "You are not a member of this vault" });
  return { db, role: mine.role };
}
