import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as cli from "@/lib/http/controllers/cli.controller";

export const cliRouter = new Hono<AppEnv>().post("/", ...cli.dispatch);
