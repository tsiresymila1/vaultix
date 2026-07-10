import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as shared from "../controllers/shared.controller";

export const sharedRouter = new Hono<AppEnv>().post("/read", ...shared.read);
