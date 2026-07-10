import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "@/lib/http/types";
import { userSearchSchema } from "@/lib/http/schemas";
import { rateLimitMw } from "@/lib/http/middleware/ratelimit";
import { instantAuth } from "@/lib/http/middleware/auth";
import { searchProfileByEmail } from "@/lib/http/services/profile.service";

const factory = createFactory<AppEnv>();

export const search = factory.createHandlers(
  rateLimitMw("users-search", 20, 60_000),
  instantAuth,
  zValidator("json", userSearchSchema),
  async (c) => c.json(await searchProfileByEmail(c.req.valid("json").email)),
);
