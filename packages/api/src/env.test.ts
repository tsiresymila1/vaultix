import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VALID = {
  NEXT_PUBLIC_INSTANT_APP_ID: "00000000-0000-0000-0000-000000000000",
  INSTANT_ADMIN_TOKEN: "admin-token",
  CLI_JWT_SECRET: "a-cli-jwt-secret-that-is-at-least-32-characters",
  CRON_SECRET: "cron-secret-16chars",
};

function applyEnv(env: Record<string, string | undefined>) {
  // clientEnv parses at import time from NEXT_PUBLIC_INSTANT_APP_ID, so keep it set.
  process.env.NEXT_PUBLIC_INSTANT_APP_ID = env.NEXT_PUBLIC_INSTANT_APP_ID;
  for (const key of ["INSTANT_ADMIN_TOKEN", "CLI_JWT_SECRET", "CRON_SECRET"] as const) {
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
    expect(env.CLI_JWT_SECRET).toBe(VALID.CLI_JWT_SECRET);
    expect(env.CRON_SECRET).toBe(VALID.CRON_SECRET);
  });

  it("throws when INSTANT_ADMIN_TOKEN is missing", async () => {
    applyEnv({ ...VALID, INSTANT_ADMIN_TOKEN: undefined });
    const { serverEnv } = await import("./env");
    expect(() => serverEnv()).toThrow();
  });

  it("throws when CLI_JWT_SECRET is too short", async () => {
    applyEnv({ ...VALID, CLI_JWT_SECRET: "too-short" });
    const { serverEnv } = await import("./env");
    expect(() => serverEnv()).toThrow();
  });
});
