import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "@/lib/http/types";
import { sharedReadSchema } from "@/lib/http/schemas";
import { rateLimitMw } from "@/lib/http/middleware/ratelimit";
import { readSharedSecret } from "@/lib/http/services/shared.service";

const factory = createFactory<AppEnv>();

export const read = factory.createHandlers(
  rateLimitMw("shared-read", 30, 60_000),
  zValidator("json", sharedReadSchema),
  async (c) => c.json(await readSharedSecret(c.req.valid("json").id)),
);
