// Env must be set BEFORE importing the module — serverEnv() validates at first
// call and jwt.ts reads AUTH_JWT_SECRET through it.
process.env.AUTH_JWT_SECRET = "test-cli-jwt-secret-at-least-32-chars-long";
process.env.INSTANT_ADMIN_TOKEN = "test-admin-token";
process.env.SECRETS_ENC_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
process.env.CRON_SECRET = "test-cron-secret-16chars";
process.env.NEXT_PUBLIC_INSTANT_APP_ID = "00000000-0000-0000-0000-000000000000";

import { describe, expect, it } from "vitest";
import { signCliToken, verifyCliToken } from "./jwt";

describe("CLI token", () => {
  it("round-trips { userId, email }", async () => {
    const payload = { userId: "user-123", email: "user@example.com" };
    const token = await signCliToken(payload);
    const verified = await verifyCliToken(token);
    expect(verified).toEqual(payload);
  });

  it("returns null for a tampered token", async () => {
    const token = await signCliToken({ userId: "u", email: "e@e.com" });
    // Flip a character in the middle of the payload segment so the signed
    // content no longer matches the signature (reliably invalidates the HMAC).
    const parts = token.split(".");
    const mid = Math.floor(parts[1].length / 2);
    parts[1] =
      parts[1].slice(0, mid) +
      (parts[1][mid] === "A" ? "B" : "A") +
      parts[1].slice(mid + 1);
    const tampered = parts.join(".");
    expect(await verifyCliToken(tampered)).toBeNull();
  });

  it("returns null for a garbage string", async () => {
    expect(await verifyCliToken("not-a-jwt")).toBeNull();
  });
});
