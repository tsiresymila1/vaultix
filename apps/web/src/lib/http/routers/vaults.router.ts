import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as vaults from "@/lib/http/controllers/vaults.controller";

export const vaultsRouter = new Hono<AppEnv>()
  .post("/members", ...vaults.invite)
  .delete("/members", ...vaults.remove);
