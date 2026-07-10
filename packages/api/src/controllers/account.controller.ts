import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { accountEmailSchema, accountSetupSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { instantAuth } from "../middleware/auth";
import { deleteAccount, changeEmail, setupProfile, getMyKeys } from "../services/account.service";

const factory = createFactory<AppEnv>();

/** Create the caller's profile during registration (reliable, admin-backed). */
export const setup = factory.createHandlers(
  rateLimitMw("account-setup", 10, 60_000),
  instantAuth,
  zValidator("json", accountSetupSchema),
  async (c) => c.json(await setupProfile(c.get("user"), c.req.valid("json"))),
);

/** The authed user's own keys: public key + unwrapped raw private key (or null
 *  if no profile yet). Admin-backed, reliable right after sign-in. */
export const me = factory.createHandlers(
  rateLimitMw("account-me", 60, 60_000),
  instantAuth,
  async (c) => c.json(await getMyKeys(c.get("user"))),
);

export const remove = factory.createHandlers(
  rateLimitMw("account-delete", 5, 60_000),
  instantAuth,
  async (c) => c.json(await deleteAccount(c.get("user"))),
);

export const email = factory.createHandlers(
  rateLimitMw("account-email", 10, 60_000),
  instantAuth,
  zValidator("json", accountEmailSchema),
  () => changeEmail(), // throws 501 (unsupported by InstantDB)
);
