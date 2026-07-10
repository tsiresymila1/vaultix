import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as cron from "@/lib/http/controllers/cron.controller";

export const cronRouter = new Hono<AppEnv>().get("/cleanup-shared", ...cron.cleanupShared);
