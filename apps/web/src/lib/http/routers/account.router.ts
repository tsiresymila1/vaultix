import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as account from "@/lib/http/controllers/account.controller";

export const accountRouter = new Hono<AppEnv>()
  .delete("/delete", ...account.remove)
  .post("/email", ...account.email);
