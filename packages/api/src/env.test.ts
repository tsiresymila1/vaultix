import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VALID = {
  NEXT_PUBLIC_INSTANT_APP_ID: "00000000-0000-0000-0000-000000000000",
  INSTANT_ADMIN_TOKEN: "admin-token",
  AUTH_JWT_SECRET: "a-cli-jwt-secret-that-is-at-least-32-characters",
  SECRETS_ENC_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", // 32 zero bytes
  CRON_SECRET: "cron-secret-16chars",
};

function applyEnv(env: Record<string, string | undefined>) {
  // clientEnv parses at import time from NEXT_PUBLIC_INSTANT_APP_ID, so keep it set.
  process.env.NEXT_PUBLIC_INSTANT_APP_ID = env.NEXT_PUBLIC_INSTANT_APP_ID;
  for (const key of ["INSTANT_ADMIN_TOKEN", "AUTH_JWT_SECRET", "SECRETS_ENC_KEY", "CRON_SECRET"] as const) {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }
}

describe("serverEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    applyEnv(VALID);
  });

  it("parses a valid environment", async () => {
    applyEnv(VALID);
    const { serverEnv } = await import("./env");
    const env = serverEnv();
    expect(env.INSTANT_ADMIN_TOKEN).toBe(VALID.INSTANT_ADMIN_TOKEN);
    expect(env.AUTH_JWT_SECRET).toBe(VALID.AUTH_JWT_SECRET);
    expect(env.CRON_SECRET).toBe(VALID.CRON_SECRET);
  });

  it("throws when INSTANT_ADMIN_TOKEN is missing", async () => {
    applyEnv({ ...VALID, INSTANT_ADMIN_TOKEN: undefined });
    const { serverEnv } = await import("./env");
    expect(() => serverEnv()).toThrow();
  });

  it("throws when AUTH_JWT_SECRET is too short", async () => {
    applyEnv({ ...VALID, AUTH_JWT_SECRET: "too-short" });
    const { serverEnv } = await import("./env");
    expect(() => serverEnv()).toThrow();
  });
});
