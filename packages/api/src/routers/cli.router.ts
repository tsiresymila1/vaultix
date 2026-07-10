import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as cli from "../controllers/cli.controller";

export const cliRouter = new Hono<AppEnv>().post("/", ...cli.dispatch);
