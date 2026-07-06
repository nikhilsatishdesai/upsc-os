import { describe, expect, it } from "vitest";

import {
  estimateRequestTokens,
  estimateTokens,
  trimToTokenBudget,
} from "./tokens";
import type { AiRequest } from "./types";

describe("token estimation", () => {
  it("estimates roughly chars/4", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("12345678")).toBe(2);
  });

  it("sums a request's system + messages", () => {
    const request: AiRequest = {
      system: "abcd",
      messages: [
        { role: "user", content: "efgh" },
        { role: "assistant", content: "ijkl" },
      ],
      maxTokens: 100,
    };
    expect(estimateRequestTokens(request)).toBe(3); // 12 chars / 4
  });
});

describe("trimToTokenBudget", () => {
  it("returns text unchanged when within budget", () => {
    expect(trimToTokenBudget("short", 100)).toBe("short");
  });

  it("trims oversized text and marks it", () => {
    const long = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
    const trimmed = trimToTokenBudget(long, 10);
    expect(trimmed.length).toBeLessThan(long.length);
    expect(trimmed).toContain("trimmed to fit context budget");
  });

  it("returns empty for a zero budget", () => {
    expect(trimToTokenBudget("anything", 0)).toBe("");
  });
});
