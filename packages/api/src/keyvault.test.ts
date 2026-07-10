process.env.NEXT_PUBLIC_INSTANT_APP_ID = "00000000-0000-0000-0000-000000000000";
process.env.INSTANT_ADMIN_TOKEN = "test-admin-token";
process.env.AUTH_JWT_SECRET = "test-cli-jwt-secret-at-least-32-chars-long";
process.env.SECRETS_ENC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
process.env.CRON_SECRET = "test-cron-secret-16chars";

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { wrapKey, unwrapKey } from "./keyvault";

describe("keyvault", () => {
  it("wrap then unwrap round-trips a key", () => {
    const raw = crypto.randomBytes(32).toString("base64");
    expect(unwrapKey(wrapKey(raw))).toBe(raw);
  });

  it("produces different ciphertext each call (random iv)", () => {
    const raw = crypto.randomBytes(32).toString("base64");
    expect(wrapKey(raw)).not.toBe(wrapKey(raw));
  });

  it("rejects a tampered blob", () => {
    const wrapped = wrapKey(crypto.randomBytes(32).toString("base64"));
    const buf = Buffer.from(wrapped, "base64");
    buf[buf.length - 1] ^= 0xff; // flip a ciphertext byte → GCM auth fails
    expect(() => unwrapKey(buf.toString("base64"))).toThrow();
  });
});
