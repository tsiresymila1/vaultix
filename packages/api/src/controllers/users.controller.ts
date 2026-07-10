import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { userSearchSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { instantAuth } from "../middleware/auth";
import { searchProfileByEmail } from "../services/profile.service";

const factory = createFactory<AppEnv>();

export const search = factory.createHandlers(
  rateLimitMw("users-search", 20, 60_000),
  instantAuth,
  zValidator("json", userSearchSchema),
  async (c) => c.json(await searchProfileByEmail(c.req.valid("json").email)),
);
