import { createAdminDb } from "../db-admin";

/** Profile + crypto material for a $users id (null if none). */
export async function getProfileByUserId(userId: string) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.id": userId } } },
  });
  return profiles?.[0] ?? null;
}

/** Public lookup by email: profile id + public key (for sharing a vault key). */
export async function searchProfileByEmail(email: string) {
  const db = createAdminDb();
  const { profiles } = await db.query({
    profiles: { $: { where: { "$user.email": email } }, $user: {} },
  });
  const profile = profiles?.[0];
  if (!profile) return null;
  return { profileId: profile.id, publicKey: profile.publicKey, email };
}
