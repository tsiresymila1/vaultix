import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as vaults from "../controllers/vaults.controller";

export const vaultsRouter = new Hono<AppEnv>()
  .post("/", ...vaults.create)
  .patch("/", ...vaults.rename)
  .delete("/", ...vaults.destroy)
  .post("/members", ...vaults.invite)
  .delete("/members", ...vaults.remove)
  .post("/secrets", ...vaults.secretCreate)
  .post("/secrets/import", ...vaults.secretImport)
  .patch("/secrets", ...vaults.secretUpdate)
  .delete("/secrets", ...vaults.secretDelete)
  .post("/environments", ...vaults.envCreate)
  .patch("/environments", ...vaults.envRename)
  .delete("/environments", ...vaults.envDelete);
