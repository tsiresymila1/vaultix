import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppEnv } from "../types";
import { mintTokenSchema } from "../schemas";
import { rateLimitMw } from "../middleware/ratelimit";
import { mintToken } from "../services/auth.service";

const factory = createFactory<AppEnv>();

export const mint = factory.createHandlers(
  rateLimitMw("token-mint", 10, 60_000),
  zValidator("json", mintTokenSchema),
  async (c) => c.json(await mintToken(c.req.valid("json").instantToken)),
);

/** Browser entry the CLI opens → hand off to the client /cli/login page. */
export const cliRedirect = factory.createHandlers((c) => {
  const callback = c.req.query("callback");
  if (!callback) return c.text("Missing callback URL", 400);
  const url = new URL("/cli/login", c.req.url);
  url.searchParams.set("callback", callback);
  return c.redirect(url.toString());
});
