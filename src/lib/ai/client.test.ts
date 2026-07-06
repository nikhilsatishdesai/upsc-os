import { describe, expect, it, vi } from "vitest";

import { createAiClient, type AiClientDeps } from "./client";
import {
  AiError,
  type AiClientConfig,
  type AiProviderAdapter,
  type AiRequest,
  type AiResponse,
  type AiUsageRecord,
} from "./types";
import { cacheKey, type AiCacheEntry, type AiCacheMap } from "./cache";

const request: AiRequest = {
  system: "sys",
  messages: [{ role: "user", content: "hello" }],
  maxTokens: 100,
};

function okResponse(provider: AiResponse["provider"], text = "ok"): AiResponse {
  return {
    text,
    usage: { inputTokens: 5, outputTokens: 7 },
    model: `${provider}-model`,
    provider,
    cached: false,
  };
}

function adapter(
  id: AiProviderAdapter["id"],
  impl: Partial<AiProviderAdapter>,
): AiProviderAdapter {
  return {
    id,
    complete: impl.complete ?? (async () => okResponse(id)),
    stream: impl.stream ?? (async (_s, _r, onDelta) => {
      onDelta("ok");
      return okResponse(id);
    }),
    ...(impl.listModels ? { listModels: impl.listModels } : {}),
  };
}

function baseConfig(overrides: Partial<AiClientConfig> = {}): AiClientConfig {
  return {
    providers: {
      anthropic: { apiKey: "a", selectedModel: "" },
      openai: { apiKey: "o", selectedModel: "" },
    },
    order: ["anthropic", "openai"],
    routing: {},
    dailyBudgetTokens: 0,
    ...overrides,
  };
}

function makeClient(
  config: AiClientConfig,
  adapters: Partial<Record<AiResponse["provider"], AiProviderAdapter>>,
  extra: Partial<AiClientDeps> = {},
) {
  return createAiClient({
    getConfig: () => config,
    adapters,
    sleep: async () => {},
    now: () => 1_000,
    random: () => 0.5,
    ...extra,
  });
}

describe("routing", () => {
  it("resolves the capability chain to configured providers only", () => {
    const client = makeClient(
      baseConfig({ routing: { summary: ["openai", "anthropic"] } }),
      {},
    );
    const chain = client.resolveChain("summary");
    expect(chain.map((c) => c.provider)).toEqual(["openai", "anthropic"]);
  });

  it("reports configured providers and skips keyless ones", () => {
    const client = makeClient(
      baseConfig({ providers: { anthropic: { apiKey: "a", selectedModel: "" } } }),
      {},
    );
    expect(client.configuredProviders()).toEqual(["anthropic"]);
    expect(client.isConfigured()).toBe(true);
  });

  it("sends the user's exact model id — including a future one — verbatim", () => {
    const client = makeClient(
      baseConfig({
        providers: {
          anthropic: { apiKey: "a", selectedModel: "claude-sonnet-6" },
        },
        order: ["anthropic"],
      }),
      {},
    );
    expect(client.resolveChain("chat")[0].model).toBe("claude-sonnet-6");
  });

  it("falls back to the provider seed model only when none is chosen", () => {
    const client = makeClient(
      baseConfig({
        providers: { anthropic: { apiKey: "a", selectedModel: "  " } },
        order: ["anthropic"],
      }),
      {},
    );
    // Blank ⇒ the single seed (not a hardcoded list) so a fresh key works.
    expect(client.resolveChain("chat")[0].model).not.toBe("");
  });
});

describe("listModels (refresh)", () => {
  it("fetches with the configured key and sorts the result", async () => {
    const client = makeClient(
      baseConfig({
        providers: { openai: { apiKey: "o", selectedModel: "gpt-6" } },
        order: ["openai"],
      }),
      {
        openai: adapter("openai", {
          listModels: async () => [
            { id: "gpt-9", label: "gpt-9" },
            { id: "gpt-4", label: "gpt-4" },
          ],
        }),
      },
    );
    const models = await client.listModels("openai");
    expect(models.map((m) => m.id)).toEqual(["gpt-4", "gpt-9"]); // sorted
  });

  it("rejects when the provider has no key", async () => {
    const client = makeClient(
      baseConfig({ providers: {}, order: [] }),
      {},
    );
    await expect(client.listModels("openai")).rejects.toMatchObject({
      kind: "not-configured",
    });
  });
});

describe("request execution", () => {
  it("returns the first provider's response and records usage", async () => {
    const usage: AiUsageRecord[] = [];
    const client = makeClient(
      baseConfig(),
      { anthropic: adapter("anthropic", {}) },
      { onUsage: (record) => usage.push(record) },
    );
    const response = await client.request(request, { feature: "topic-summary" });
    expect(response.provider).toBe("anthropic");
    expect(usage[0]).toMatchObject({ ok: true, provider: "anthropic" });
    expect(usage[0].estimatedCostUsd).toBeGreaterThan(0);
  });

  it("retries a retryable error on the same provider, then succeeds", async () => {
    let calls = 0;
    const client = makeClient(baseConfig(), {
      anthropic: adapter("anthropic", {
        complete: async () => {
          calls += 1;
          if (calls === 1) throw new AiError("overloaded", "busy");
          return okResponse("anthropic");
        },
      }),
    });
    const response = await client.request(request, { feature: "topic-summary" });
    expect(calls).toBe(2);
    expect(response.provider).toBe("anthropic");
  });

  it("falls back to the next provider on a non-retryable failure", async () => {
    const client = makeClient(baseConfig(), {
      anthropic: adapter("anthropic", {
        complete: async () => {
          throw new AiError("auth", "bad key", { provider: "anthropic" });
        },
      }),
      openai: adapter("openai", {}),
    });
    const response = await client.request(request, { feature: "topic-summary" });
    expect(response.provider).toBe("openai");
  });

  it("does not fall back on a budget failure", async () => {
    const client = makeClient(
      baseConfig({ dailyBudgetTokens: 10 }),
      { anthropic: adapter("anthropic", {}) },
      { usedTokensToday: () => 10_000 },
    );
    await expect(
      client.request(request, { feature: "topic-summary" }),
    ).rejects.toMatchObject({ kind: "budget" });
  });

  it("errors clearly when nothing is configured", async () => {
    const client = makeClient(
      baseConfig({ providers: {}, order: [] }),
      {},
    );
    await expect(
      client.request(request, { feature: "topic-summary" }),
    ).rejects.toMatchObject({ kind: "not-configured" });
  });
});

describe("caching", () => {
  it("serves a cache hit without calling a provider", async () => {
    const store: AiCacheMap = {};
    // Config pins an explicit model so the client's key is predictable.
    const config = baseConfig({
      providers: { anthropic: { apiKey: "a", selectedModel: "anthropic-model" } },
      order: ["anthropic"],
    });
    const key = cacheKey("anthropic", "anthropic-model", "v1", request);
    const entry: AiCacheEntry = {
      text: "cached!",
      model: "anthropic-model",
      provider: "anthropic",
      inputTokens: 1,
      outputTokens: 1,
      createdAt: "2026-07-06T00:00:00Z",
      lastUsedAt: "2026-07-06T00:00:00Z",
    };
    store[key] = entry;

    const complete = vi.fn(async () => okResponse("anthropic"));
    const client = makeClient(
      config,
      { anthropic: adapter("anthropic", { complete }) },
      {
        cache: {
          get: (k) => store[k] ?? null,
          put: (k, e) => {
            store[k] = e;
          },
        },
      },
    );

    const response = await client.request(request, {
      feature: "topic-summary",
      cache: true,
      promptVersion: "v1",
    });
    expect(response.cached).toBe(true);
    expect(response.text).toBe("cached!");
    expect(complete).not.toHaveBeenCalled();
  });

  it("writes to cache on a miss and bypasses on regenerate", async () => {
    const store: AiCacheMap = {};
    const complete = vi.fn(async () => okResponse("anthropic", "fresh"));
    const client = makeClient(
      baseConfig(),
      { anthropic: adapter("anthropic", { complete }) },
      {
        cache: {
          get: (k) => store[k] ?? null,
          put: (k, e) => {
            store[k] = e;
          },
        },
      },
    );
    await client.request(request, {
      feature: "topic-summary",
      cache: true,
      promptVersion: "v1",
    });
    expect(Object.keys(store)).toHaveLength(1);

    // bypassCache forces a fresh call
    await client.request(request, {
      feature: "topic-summary",
      cache: true,
      bypassCache: true,
      promptVersion: "v1",
    });
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe("streaming", () => {
  it("emits deltas and returns the final response", async () => {
    const client = makeClient(baseConfig(), {
      anthropic: adapter("anthropic", {
        stream: async (_s, _r, onDelta) => {
          onDelta("He");
          onDelta("llo");
          return okResponse("anthropic", "Hello");
        },
      }),
    });
    const deltas: string[] = [];
    const done = vi.fn();
    const response = await client.stream(
      request,
      { onDelta: (d) => deltas.push(d), onDone: done },
      { feature: "mentor-chat" },
    );
    expect(deltas.join("")).toBe("Hello");
    expect(response.text).toBe("Hello");
    expect(done).toHaveBeenCalledOnce();
  });

  it("reports errors through onError", async () => {
    const client = makeClient(
      baseConfig({ providers: { anthropic: { apiKey: "a", selectedModel: "" } }, order: ["anthropic"] }),
      {
        anthropic: adapter("anthropic", {
          stream: async () => {
            throw new AiError("content", "declined", { provider: "anthropic" });
          },
        }),
      },
    );
    const onError = vi.fn();
    await expect(
      client.stream(request, { onDelta: () => {}, onError }, { feature: "mentor-chat" }),
    ).rejects.toBeInstanceOf(AiError);
    expect(onError).toHaveBeenCalledOnce();
  });
});
