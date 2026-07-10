import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "@/lib/http/types";
import { serverEnv } from "@/lib/env";
import { cleanupSharedSecrets } from "@/lib/http/services/shared.service";

const factory = createFactory<AppEnv>();

export const cleanupShared = factory.createHandlers(async (c) => {
  if (c.req.header("authorization") !== `Bearer ${serverEnv().CRON_SECRET}`) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return c.json({ deleted: await cleanupSharedSecrets() });
});
