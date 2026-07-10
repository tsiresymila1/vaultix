import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/** Central error handler: HTTPExceptions pass through their status/message; the
 *  rest become a generic 500 (no internal detail leaked to clients). */
export function onError(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[http] unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
}
