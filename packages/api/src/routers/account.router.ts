import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as account from "../controllers/account.controller";

export const accountRouter = new Hono<AppEnv>()
  .delete("/delete", ...account.remove)
  .post("/email", ...account.email);
