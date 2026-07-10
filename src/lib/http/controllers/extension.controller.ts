import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "@/lib/http/types";
import { rateLimitMw } from "@/lib/http/middleware/ratelimit";
import { jwtAuth } from "@/lib/http/middleware/auth";
import { getProfileByUserId } from "@/lib/http/services/profile.service";
import { listPasswordsForUser } from "@/lib/http/services/password.service";

const factory = createFactory<AppEnv>();

/** Browser entry the extension opens → hand off to /extension/login. */
export const authRedirect = factory.createHandlers((c) => {
  const callback = c.req.query("callback");
  if (!callback) return c.text("Missing callback URL", 400);
  const url = new URL("/extension/login", c.req.url);
  url.searchParams.set("callback", callback);
  return c.redirect(url.toString());
});

export const me = factory.createHandlers(
  rateLimitMw("ext-me", 60, 60_000),
  jwtAuth,
  async (c) => {
    const user = c.get("user");
    const profile = await getProfileByUserId(user.id);
    if (!profile) throw new HTTPException(404, { message: "User not found" });
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        public_key: profile.publicKey,
        encrypted_private_key: profile.encryptedPrivateKey,
        private_key_nonce: profile.privateKeyNonce,
        master_key_salt: profile.masterKeySalt,
        full_name: profile.fullName ?? null,
      },
    });
  },
);

export const passwords = factory.createHandlers(
  rateLimitMw("ext-pw", 60, 60_000),
  jwtAuth,
  async (c) => c.json({ passwords: await listPasswordsForUser(c.get("user").id) }),
);
