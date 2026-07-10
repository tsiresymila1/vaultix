import { HTTPException } from "hono/http-exception";
import { createAdminDb } from "@/lib/db-admin";

/** Read an ephemeral shared secret, decrementing views and deleting when spent. */
export async function readSharedSecret(id: string) {
  const db = createAdminDb();
  const { sharedSecrets } = await db.query({
    sharedSecrets: { $: { where: { id } } },
  });
  const secret = sharedSecrets?.[0];
  if (!secret) throw new HTTPException(404, { message: "Not found or already viewed" });

  const expired = Number(secret.expiresAt) <= Date.now();
  const exhausted = secret.viewsRemaining <= 0;
  if (expired || exhausted) {
    await db.transact(db.tx.sharedSecrets[secret.id].delete());
    throw new HTTPException(404, { message: "Not found or already viewed" });
  }

  const remaining = secret.viewsRemaining - 1;
  if (remaining <= 0) {
    await db.transact(db.tx.sharedSecrets[secret.id].delete());
  } else {
    await db.transact(db.tx.sharedSecrets[secret.id].update({ viewsRemaining: remaining }));
  }
  return { encryptedPayload: secret.encryptedPayload, nonce: secret.nonce };
}

/** Delete expired/exhausted shared secrets (cron). Returns the count removed. */
export async function cleanupSharedSecrets() {
  const db = createAdminDb();
  const now = Date.now();
  const { sharedSecrets } = await db.query({ sharedSecrets: {} });
  const stale = (sharedSecrets ?? []).filter(
    (s) => Number(s.expiresAt) <= now || s.viewsRemaining <= 0,
  );
  if (stale.length > 0) {
    await db.transact(stale.map((s) => db.tx.sharedSecrets[s.id].delete()));
  }
  return stale.length;
}
