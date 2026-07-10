import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as passwords from "@/lib/http/controllers/passwords.controller";

export const passwordsRouter = new Hono<AppEnv>()
  .post("/share", ...passwords.share)
  .delete("/share", ...passwords.revoke);
