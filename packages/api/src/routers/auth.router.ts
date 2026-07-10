import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as auth from "../controllers/auth.controller";

export const authRouter = new Hono<AppEnv>()
  .get("/cli", ...auth.cliRedirect)
  .post("/token/mint", ...auth.mint);
