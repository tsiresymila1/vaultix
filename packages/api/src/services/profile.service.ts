import { createAdminDb } from "../db-admin";

/** Profile + crypto material for a $users id (null if none). */
export async function getProfileByUserId(userId: string) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.id": userId } } },
  });
  return profiles?.[0] ?? null;
}

/** Public lookup by email: profile id + public keys (identity key for vault
 *  sharing, password key for password-entry sharing). `pwPublicKey` is null if
 *  the user hasn't set up their password vault yet. */
export async function searchProfileByEmail(email: string) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.email": email } }, $user: {} },
  });
  const profile = profiles?.[0];
  if (!profile) return null;
  return {
    profileId: profile.id,
    publicKey: profile.publicKey,
    pwPublicKey: profile.pwPublicKey ?? null,
    email,
  };
}
