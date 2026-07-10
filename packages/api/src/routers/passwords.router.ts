import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as passwords from "../controllers/passwords.controller";

export const passwordsRouter = new Hono<AppEnv>()
  .post("/", ...passwords.create)
  .post("/share", ...passwords.share)
  .delete("/share", ...passwords.revoke);
