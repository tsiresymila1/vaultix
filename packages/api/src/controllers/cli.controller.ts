import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { cliActionSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { jwtAuth } from "../middleware/auth";
import { dispatchCli } from "../services/cli.service";

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
