import { HTTPException } from "hono/http-exception";
import { createAdminDb } from "../db-admin";
import { signCliToken } from "../jwt";

/** Exchange a verified InstantDB session token for a long-lived Vaultix JWT. */
export async function mintToken(instantToken: string) {
  const db = createAdminDb();
  let user;
  try {
    user = await db.auth.verifyToken(instantToken);
  } catch {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  if (!user?.id || !user.email) throw new HTTPException(401, { message: "Unauthorized" });
  const token = await signCliToken({ userId: user.id, email: user.email });
  return { token, email: user.email };
}
