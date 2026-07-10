import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as cron from "../controllers/cron.controller";

export const cronRouter = new Hono<AppEnv>().get("/cleanup-shared", ...cron.cleanupShared);
