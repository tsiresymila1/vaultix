import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as shared from "@/lib/http/controllers/shared.controller";

export const sharedRouter = new Hono<AppEnv>().post("/read", ...shared.read);
