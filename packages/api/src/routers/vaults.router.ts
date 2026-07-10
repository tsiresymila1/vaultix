import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as vaults from "../controllers/vaults.controller";

export const vaultsRouter = new Hono<AppEnv>()
  .post("/members", ...vaults.invite)
  .delete("/members", ...vaults.remove);
