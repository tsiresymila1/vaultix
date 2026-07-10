import { describe, expect, it } from "vitest";
import { rateLimit } from "./ratelimit";

const WINDOW = 60_000;

describe("rateLimit", () => {
  it("allows up to `limit` calls in a window, then blocks", () => {
    const key = `test-block-${Math.random()}`;
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      const res = rateLimit(key, limit, WINDOW);
      expect(res.ok).toBe(true);
      expect(res.remaining).toBe(limit - 1 - i);
    }

    const over = rateLimit(key, limit, WINDOW);
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    const keyA = `test-indep-a-${Math.random()}`;
    const keyB = `test-indep-b-${Math.random()}`;
    const limit = 1;

    expect(rateLimit(keyA, limit, WINDOW).ok).toBe(true);
    // keyA is now exhausted, but keyB has its own fresh budget.
    expect(rateLimit(keyA, limit, WINDOW).ok).toBe(false);
    expect(rateLimit(keyB, limit, WINDOW).ok).toBe(true);
  });
});
