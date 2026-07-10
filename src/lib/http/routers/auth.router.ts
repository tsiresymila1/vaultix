import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as auth from "@/lib/http/controllers/auth.controller";

export const authRouter = new Hono<AppEnv>()
  .get("/cli", ...auth.cliRedirect)
  .post("/token/mint", ...auth.mint);
