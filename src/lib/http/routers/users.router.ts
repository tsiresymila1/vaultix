import { Hono } from "hono";
import type { AppEnv } from "@/lib/http/types";
import * as users from "@/lib/http/controllers/users.controller";

export const usersRouter = new Hono<AppEnv>().post("/search", ...users.search);
