import { Hono } from "hono";
import type { AppEnv } from "../types";
import * as users from "../controllers/users.controller";

export const usersRouter = new Hono<AppEnv>().post("/search", ...users.search);
