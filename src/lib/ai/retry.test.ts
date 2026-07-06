import { describe, expect, it } from "vitest";

import { backoffDelayMs, isFallbackWorthy, isRetryable } from "./retry";
import { AiError } from "./types";

describe("retry classification", () => {
  it("marks transient failures retryable", () => {
    expect(isRetryable(new AiError("rate-limit", "x"))).toBe(true);
    expect(isRetryable(new AiError("overloaded", "x"))).toBe(true);
    expect(isRetryable(new AiError("network", "x"))).toBe(true);
    expect(isRetryable(new AiError("auth", "x"))).toBe(false);
    expect(isRetryable(new AiError("bad-request", "x"))).toBe(false);
  });

  it("does not fall over to another provider for terminal problems", () => {
    expect(isFallbackWorthy(new AiError("auth", "x"))).toBe(true); // key bad → try next provider
    expect(isFallbackWorthy(new AiError("budget", "x"))).toBe(false);
    expect(isFallbackWorthy(new AiError("aborted", "x"))).toBe(false);
    expect(isFallbackWorthy(new AiError("not-configured", "x"))).toBe(false);
  });
});

describe("backoff", () => {
  it("grows exponentially and honours retry-after", () => {
    const fixed = () => 1; // max jitter
    expect(backoffDelayMs(0, null, fixed)).toBe(800);
    expect(backoffDelayMs(1, null, fixed)).toBe(1600);
    expect(backoffDelayMs(2, null, fixed)).toBe(3200);
    // retry-after floor wins when larger
    expect(backoffDelayMs(0, 5000, fixed)).toBe(5000);
  });

  it("caps the delay", () => {
    expect(backoffDelayMs(10, null, () => 1)).toBeLessThanOrEqual(8000);
  });
});
