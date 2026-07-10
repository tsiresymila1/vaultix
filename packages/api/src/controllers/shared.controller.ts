import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { sharedReadSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { readSharedSecret } from "../services/shared.service";

const factory = createFactory<AppEnv>();

export const read = factory.createHandlers(
  rateLimitMw("shared-read", 30, 60_000),
  zValidator("json", sharedReadSchema),
  async (c) => c.json(await readSharedSecret(c.req.valid("json").id)),
);
