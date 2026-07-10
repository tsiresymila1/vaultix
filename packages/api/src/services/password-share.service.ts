import { HTTPException } from "hono/http-exception";
import { id } from "@instantdb/admin";
import { createAdminDb } from "../db-admin";

// A `has: one` nested link may come back as an object or single-element array.
function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

interface ShareInput {
  recipientEmail: string;
  entryId: string;
  encryptedKey: string; // entry key sealed to recipient's public key
}

/**
 * Grant a recipient live access to a password entry. The sharer must own the
 * entry. The entry key (sealed to the recipient client-side) is all that's
 * stored — the content stays on the entry, so owner edits reach every recipient.
 */
export async function sharePassword(sharerUserId: string, input: ShareInput) {
  const db = createAdminDb();

  const [{ profiles: recipients }, { profiles: sharers }, { passwordEntries }] =
    await Promise.all([
      db.query({ profiles: { $: { where: { "$user.email": input.recipientEmail } } } }),
      db.query({ profiles: { $: { where: { "$user.id": sharerUserId } } } }),
      db.query({
        passwordEntries: {
          $: { where: { id: input.entryId } },
          owner: { $user: {} },
          shares: { recipient: {} },
        },
      }),
    ]);
  const recipient = recipients?.[0];
  const sharer = sharers?.[0];
  const entry = passwordEntries?.[0];
  if (!recipient) throw new HTTPException(404, { message: "Recipient not found" });
  if (!sharer) throw new HTTPException(404, { message: "Sharer profile not found" });
  if (!entry) throw new HTTPException(404, { message: "Entry not found" });
  const ownerUser = firstOf(firstOf(entry.owner)?.$user);
  if (ownerUser?.id !== sharerUserId) {
    throw new HTTPException(403, { message: "You do not own this entry" });
  }
  if (recipient.id === sharer.id) {
    throw new HTTPException(400, { message: "Cannot share with yourself" });
  }
  if ((entry.shares ?? []).some((s) => firstOf(s.recipient)?.id === recipient.id)) {
    throw new HTTPException(409, { message: "Already shared with this user" });
  }

  await db.transact(
    db.tx.passwordShares[id()]
      .update({ encryptedKey: input.encryptedKey, createdAt: Date.now() })
      .link({ entry: entry.id, recipient: recipient.id, sharedBy: sharer.id }),
  );
  return { ok: true };
}

/** Revoke a share. Only the original sharer may revoke. */
export async function revokeShare(userId: string, shareId: string) {
  const db = createAdminDb();
  const { passwordShares } = await db.query({
    passwordShares: { $: { where: { id: shareId } }, sharedBy: { $user: {} } },
  });
  const share = passwordShares?.[0];
  if (!share) throw new HTTPException(404, { message: "Not found" });
  if (firstOf(firstOf(share.sharedBy)?.$user)?.id !== userId) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  await db.transact(db.tx.passwordShares[shareId].delete());
  return { ok: true };
}
