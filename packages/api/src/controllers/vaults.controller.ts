import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { memberInviteSchema, memberRemoveSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { instantAuth } from "../middleware/auth";
import { addMember, removeMember } from "../services/vault-members.service";

const factory = createFactory<AppEnv>();

export const invite = factory.createHandlers(
  rateLimitMw("vault-members", 30, 60_000),
  instantAuth,
  zValidator("json", memberInviteSchema),
  async (c) => c.json(await addMember(c.get("user").id, c.req.valid("json"))),
);

export const remove = factory.createHandlers(
  rateLimitMw("vault-members", 30, 60_000),
  instantAuth,
  zValidator("json", memberRemoveSchema),
  async (c) => c.json(await removeMember(c.get("user").id, c.req.valid("json").memberRowId)),
);
