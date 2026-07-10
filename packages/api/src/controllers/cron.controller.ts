import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types";
import { serverEnv } from "../env";
import { cleanupSharedSecrets } from "../services/shared.service";

const factory = createFactory<AppEnv>();

export const cleanupShared = factory.createHandlers(async (c) => {
  if (c.req.header("authorization") !== `Bearer ${serverEnv().CRON_SECRET}`) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return c.json({ deleted: await cleanupSharedSecrets() });
});
