import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { createAdminDb } from "@/lib/db-admin";
import { verifyCliToken } from "@/utils/jwt";
import type { AppEnv } from "@/lib/http/types";

function bearer(header: string | undefined | null): string | null {
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Authenticates a request bearing an InstantDB session token (web app clients). */
export const instantAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearer(c.req.header("authorization"));
  if (!token) throw new HTTPException(401, { message: "Unauthorized" });
  try {
    const user = await createAdminDb().auth.verifyToken(token);
    if (!user?.id || !user.email) throw new Error("no user");
    c.set("user", { id: user.id, email: user.email });
  } catch {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
});

/** Authenticates a request bearing a Vaultix JWT (CLI / extension). */
export const jwtAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearer(c.req.header("authorization"));
  if (!token) throw new HTTPException(401, { message: "Unauthorized: Missing token" });
  const payload = await verifyCliToken(token);
  if (!payload) throw new HTTPException(401, { message: "Unauthorized: Invalid token" });
  c.set("user", { id: payload.userId, email: payload.email });
  await next();
});
