import crypto from "node:crypto";
import { serverEnv } from "./env";

// Server-side key wrapping: protects each user's private key at rest under the
// app key (SECRETS_ENC_KEY). The server can unwrap it and hand the raw private
// key to an authenticated client — this is the (non-zero-knowledge) trade the
// product made to drop the master password. Wrapped blob = base64(iv|tag|ct).

function appKey(): Buffer {
  return Buffer.from(serverEnv().SECRETS_ENC_KEY, "base64");
}

// The wrapped value is treated as an opaque UTF-8 string so it round-trips
// EXACTLY (the keys are libsodium URL-safe-no-padding base64 — re-encoding via
// standard base64 would corrupt them).

/** Wrap a key string under the app key. Returns base64(iv|tag|ct). */
export function wrapKey(raw: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", appKey(), iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(raw, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Unwrap a blob produced by wrapKey back to the exact original key string. */
export function unwrapKey(wrapped: string): string {
  const buf = Buffer.from(wrapped, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = crypto.createDecipheriv("aes-256-gcm", appKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
