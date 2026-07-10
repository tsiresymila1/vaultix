import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "@/lib/http/types";
import { cliActionSchema } from "@/lib/http/schemas";
import { rateLimitMw } from "@/lib/http/middleware/ratelimit";
import { jwtAuth } from "@/lib/http/middleware/auth";
import { dispatchCli } from "@/lib/http/services/cli.service";

const factory = createFactory<AppEnv>();

export const dispatch = factory.createHandlers(
  rateLimitMw("cli", 60, 60_000),
  jwtAuth,
  zValidator("json", cliActionSchema),
  async (c) => {
    const { action, params } = c.req.valid("json");
    return c.json(await dispatchCli(action, params, c.get("user")));
  },
);
