import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { rateLimit, clientIp } from "../ratelimit";

/** Fixed-window rate-limit middleware keyed on `prefix:ip`. */
export function rateLimitMw(prefix: string, limit: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    const ip = clientIp(c.req.raw);
    const rl = rateLimit(`${prefix}:${ip}`, limit, windowMs);
    if (!rl.ok) throw new HTTPException(429, { message: "Too many requests" });
    await next();
  });
}
