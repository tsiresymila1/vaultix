import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import {
  passwordShareSchema,
  passwordRevokeSchema,
  passwordCreateSchema,
  passwordUpdateSchema,
  passwordDeleteSchema,
} from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { instantAuth, jwtAuth } from "../middleware/auth";
import { sharePassword, revokeShare } from "../services/password-share.service";
import {
  createPasswordEntry,
  updatePasswordEntry,
  deletePasswordEntry,
} from "../services/password.service";

const factory = createFactory<AppEnv>();

// Entry CRUD is called by the extension + mobile app, which authenticate with the
// minted Vaultix JWT → jwtAuth. (Sharing is called by the web app with its
// InstantDB token → instantAuth.)
export const create = factory.createHandlers(
  rateLimitMw("password-create", 30, 60_000),
  jwtAuth,
  zValidator("json", passwordCreateSchema),
  async (c) => c.json(await createPasswordEntry(c.get("user").id, c.req.valid("json"))),
);

export const update = factory.createHandlers(
  rateLimitMw("password-update", 30, 60_000),
  jwtAuth,
  zValidator("json", passwordUpdateSchema),
  async (c) => c.json(await updatePasswordEntry(c.get("user").id, c.req.valid("json"))),
);

export const remove = factory.createHandlers(
  rateLimitMw("password-delete", 30, 60_000),
  jwtAuth,
  zValidator("json", passwordDeleteSchema),
  async (c) => c.json(await deletePasswordEntry(c.get("user").id, c.req.valid("json").entryId)),
);

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
