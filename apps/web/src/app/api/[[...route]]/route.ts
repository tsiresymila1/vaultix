import { handle } from "hono/vercel";
import app from "@vaultix/api";

export const runtime = "nodejs";

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
