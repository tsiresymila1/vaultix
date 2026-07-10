import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as ext from "../controllers/extension.controller";

export const extensionRouter = new Hono<AppEnv>()
  .get("/auth", ...ext.authRedirect)
  .get("/me", ...ext.me)
  .get("/passwords", ...ext.passwords);
