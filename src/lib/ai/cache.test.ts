import { describe, expect, it } from "vitest";

import {
  cacheGet,
  cacheKey,
  cachePrune,
  cachePut,
  cacheTouch,
  hashContent,
  type AiCacheEntry,
  type AiCacheMap,
} from "./cache";
import type { AiRequest } from "./types";

const req: AiRequest = {
  system: "You are a mentor.",
  messages: [{ role: "user", content: "Summarize polity." }],
  maxTokens: 500,
};

const entry = (text: string, lastUsedAt: string): AiCacheEntry => ({
  text,
  model: "m",
  provider: "anthropic",
  inputTokens: 10,
  outputTokens: 20,
  createdAt: "2026-07-06T00:00:00.000Z",
  lastUsedAt,
});

describe("cache keys", () => {
  it("hashes deterministically and differs on content", () => {
    expect(hashContent("abc")).toBe(hashContent("abc"));
    expect(hashContent("abc")).not.toBe(hashContent("abd"));
  });

  it("keys are stable for identical requests", () => {
    expect(cacheKey("anthropic", "m", "v1", req)).toBe(
      cacheKey("anthropic", "m", "v1", req),
    );
  });

  it("keys change with provider, model, prompt version or request", () => {
    const base = cacheKey("anthropic", "m", "v1", req);
    expect(cacheKey("openai", "m", "v1", req)).not.toBe(base);
    expect(cacheKey("anthropic", "m2", "v1", req)).not.toBe(base);
    expect(cacheKey("anthropic", "m", "v2", req)).not.toBe(base);
    expect(
      cacheKey("anthropic", "m", "v1", { ...req, maxTokens: 501 }),
    ).not.toBe(base);
  });
});

describe("cache storage", () => {
  it("get returns null when absent or expired", () => {
    const cache: AiCacheMap = { k: entry("hi", "2026-07-06T00:00:00.000Z") };
    const created = Date.parse("2026-07-06T00:00:00.000Z");
    expect(cacheGet(cache, "missing", created, 1000)).toBeNull();
    expect(cacheGet(cache, "k", created + 500, 1000)?.text).toBe("hi");
    expect(cacheGet(cache, "k", created + 2000, 1000)).toBeNull();
  });

  it("touch updates lastUsedAt immutably", () => {
    const cache: AiCacheMap = { k: entry("hi", "2026-07-06T00:00:00.000Z") };
    const next = cacheTouch(cache, "k", Date.parse("2026-07-07T00:00:00.000Z"));
    expect(next).not.toBe(cache);
    expect(next.k.lastUsedAt).toBe("2026-07-07T00:00:00.000Z");
    expect(cache.k.lastUsedAt).toBe("2026-07-06T00:00:00.000Z");
  });

  it("put evicts the least-recently-used past the cap", () => {
    let cache: AiCacheMap = {
      a: entry("a", "2026-07-01T00:00:00.000Z"),
      b: entry("b", "2026-07-02T00:00:00.000Z"),
    };
    cache = cachePut(cache, "c", entry("c", "2026-07-03T00:00:00.000Z"), 2);
    // "a" is the oldest lastUsedAt → evicted.
    expect(Object.keys(cache).sort()).toEqual(["b", "c"]);
  });

  it("prune drops expired entries", () => {
    const cache: AiCacheMap = {
      fresh: entry("fresh", "x"),
      stale: { ...entry("stale", "x"), createdAt: "2026-01-01T00:00:00.000Z" },
    };
    const pruned = cachePrune(cache, Date.parse("2026-07-06T00:00:00.000Z"), 1000);
    expect(Object.keys(pruned)).toEqual(["fresh"]);
  });
});
