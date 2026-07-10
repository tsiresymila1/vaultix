import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "@/lib/http/types";
import { accountEmailSchema } from "@/lib/http/schemas";
import { rateLimitMw } from "@/lib/http/middleware/ratelimit";
import { instantAuth } from "@/lib/http/middleware/auth";
import { deleteAccount, changeEmail } from "@/lib/http/services/account.service";

const factory = createFactory<AppEnv>();

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
