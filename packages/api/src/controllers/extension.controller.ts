import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types";
import { rateLimitMw } from "../middleware/ratelimit";
import { jwtAuth } from "../middleware/auth";
import { getProfileByUserId } from "../services/profile.service";
import { listPasswordsForUser } from "../services/password.service";

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
        // Password-vault keypair (zero-knowledge): the extension derives the
        // master key from the user's master password to decrypt pw_private_key.
        pw_public_key: profile.pwPublicKey ?? null,
        pw_encrypted_private_key: profile.pwEncryptedPrivateKey ?? null,
        pw_private_key_nonce: profile.pwPrivateKeyNonce ?? null,
        pw_salt: profile.pwSalt ?? null,
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
