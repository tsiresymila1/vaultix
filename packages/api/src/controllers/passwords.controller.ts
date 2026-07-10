import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { passwordShareSchema, passwordRevokeSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { instantAuth } from "../middleware/auth";
import { sharePassword, revokeShare } from "../services/password-share.service";

const factory = createFactory<AppEnv>();

export const share = factory.createHandlers(
  rateLimitMw("password-share", 30, 60_000),
  instantAuth,
  zValidator("json", passwordShareSchema),
  async (c) => c.json(await sharePassword(c.get("user").id, c.req.valid("json"))),
);

export const revoke = factory.createHandlers(
  rateLimitMw("password-share", 30, 60_000),
  instantAuth,
  zValidator("json", passwordRevokeSchema),
  async (c) => c.json(await revokeShare(c.get("user").id, c.req.valid("json").shareId)),
);
