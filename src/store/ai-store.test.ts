import { beforeEach, describe, expect, it, vi } from "vitest";

function createMemoryStorage(): Storage {
  let data: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(data).length;
    },
    key: (i: number) => Object.keys(data)[i] ?? null,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    clear: () => {
      data = {};
    },
  };
}
vi.stubGlobal("localStorage", createMemoryStorage());

const {
  useAiStore,
  aiClientConfig,
  aiConfigured,
  usedTokensToday,
  summarizeUsage,
  exportAi,
  sanitizeAiExport,
  migrateAiV1ToV2,
} = await import("@/store/ai-store");
const { exportStateToJSON, parseExportedState, BACKUP_VERSION } = await import(
  "@/store/app-store"
);
const { AI_CONFIG } = await import("@/lib/ai/config");

const TOPIC = "prelims.gs.polity.constitution.fundamental-rights";

beforeEach(() => useAiStore.getState().resetAi());

describe("provider configuration", () => {
  it("sets, orders and clears providers", () => {
    const store = useAiStore.getState();
    store.setProvider("anthropic", {
      apiKey: "  k  ",
      selectedModel: "claude-opus-4-8",
    });
    expect(useAiStore.getState().providers.anthropic).toEqual({
      apiKey: "k", // trimmed
      selectedModel: "claude-opus-4-8",
    });
    expect(aiConfigured(useAiStore.getState().providers)).toBe(true);

    store.setProviderOrder(["openai", "anthropic", "gemini"]);
    expect(useAiStore.getState().order[0]).toBe("openai");

    store.removeProvider("anthropic");
    expect(aiConfigured(useAiStore.getState().providers)).toBe(false);
  });

  it("accepts ANY model id verbatim — no whitelist, no code change", () => {
    const store = useAiStore.getState();
    // Models that don't exist yet must still be storable and sent as-is.
    store.setProvider("anthropic", { apiKey: "k", selectedModel: "claude-sonnet-6" });
    store.setProviderModel("anthropic", "  gpt-99-ultra  ");
    expect(useAiStore.getState().providers.anthropic?.selectedModel).toBe(
      "gpt-99-ultra",
    );
  });

  it("caches refreshed model ids without affecting the selected model", () => {
    const store = useAiStore.getState();
    store.setProvider("gemini", { apiKey: "g", selectedModel: "gemini-3-pro" });
    store.cacheProviderModels("gemini", ["gemini-3-pro", "gemini-4-ultra"]);
    const provider = useAiStore.getState().providers.gemini;
    expect(provider?.availableModels).toEqual(["gemini-3-pro", "gemini-4-ultra"]);
    expect(provider?.selectedModel).toBe("gemini-3-pro"); // unchanged
    expect(typeof provider?.lastRefresh).toBe("string");
  });

  it("stores per-capability routing and clears it", () => {
    const store = useAiStore.getState();
    store.setRouting("summary", ["gemini", "anthropic"]);
    expect(useAiStore.getState().routing.summary).toEqual(["gemini", "anthropic"]);
    store.setRouting("summary", null);
    expect(useAiStore.getState().routing.summary).toBeUndefined();
  });

  it("exposes a client config snapshot", () => {
    useAiStore.getState().setProvider("openai", { apiKey: "o", selectedModel: "" });
    const config = aiClientConfig(useAiStore.getState());
    expect(config.providers.openai?.apiKey).toBe("o");
  });
});

describe("response cache via the store", () => {
  it("stores, reads and refreshes cache entries", () => {
    const store = useAiStore.getState();
    store.putCached("k1", {
      text: "hi",
      model: "m",
      provider: "anthropic",
      inputTokens: 1,
      outputTokens: 1,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
    expect(useAiStore.getState().getCached("k1")?.text).toBe("hi");
    expect(useAiStore.getState().getCached("missing")).toBeNull();
  });
});

describe("usage tracking (cost manager)", () => {
  it("records usage, summarizes it and totals today's tokens", () => {
    const store = useAiStore.getState();
    const now = new Date().toISOString();
    store.recordUsage({
      at: now,
      provider: "anthropic",
      model: "claude-opus-4-8",
      feature: "topic-summary",
      inputTokens: 100,
      outputTokens: 200,
      estimatedCostUsd: 0.006,
      durationMs: 800,
      ok: true,
      cached: false,
      error: null,
    });
    store.recordUsage({
      at: now,
      provider: "anthropic",
      model: "claude-opus-4-8",
      feature: "quiz-generation",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs: 0,
      ok: false,
      cached: false,
      error: "rate-limit",
    });
    const usage = useAiStore.getState().usage;
    const summary = summarizeUsage(usage);
    expect(summary.requests).toBe(2);
    expect(summary.failures).toBe(1);
    expect(summary.inputTokens).toBe(100);
    expect(usedTokensToday(usage, now.slice(0, 10))).toBe(300);
  });
});

describe("conversations & memory", () => {
  it("creates conversations, appends messages and caps the count", () => {
    const store = useAiStore.getState();
    const id = store.startConversation(null, "First chat");
    store.appendMessage(id, {
      id: "m1",
      role: "user",
      content: "Hi",
      at: new Date().toISOString(),
    });
    expect(useAiStore.getState().conversations[id].messages).toHaveLength(1);

    for (let i = 0; i < AI_CONFIG.memory.conversationCap + 3; i++) {
      useAiStore.getState().startConversation(null, `Chat ${i}`);
    }
    expect(
      Object.keys(useAiStore.getState().conversations).length,
    ).toBeLessThanOrEqual(AI_CONFIG.memory.conversationCap);
  });

  it("remembers accepted and rejected action decisions", () => {
    const store = useAiStore.getState();
    store.recordActionDecision("Rebuild the plan", true);
    store.recordActionDecision("Exclude economics", false);
    const memory = useAiStore.getState().memory;
    expect(memory.acceptedActions[0]).toContain("Rebuild the plan");
    expect(memory.rejectedActions[0]).toContain("Exclude economics");
  });

  it("logs recent AI activity capped to the config limit", () => {
    const store = useAiStore.getState();
    for (let i = 0; i < AI_CONFIG.activityLogCap + 5; i++) {
      store.logActivity({ kind: "feature", label: "topic-summary", detail: "m", ok: true });
    }
    expect(useAiStore.getState().activity.length).toBe(AI_CONFIG.activityLogCap);
  });
});

describe("export / import", () => {
  it("never exports API keys but preserves models, routing and memory", () => {
    const store = useAiStore.getState();
    store.setProvider("anthropic", {
      apiKey: "secret",
      selectedModel: "claude-opus-4-8",
    });
    store.setRouting("summary", ["anthropic"]);
    store.recordActionDecision("Rebuild plan", true);

    const exported = exportAi();
    expect(JSON.stringify(exported)).not.toContain("secret");
    expect(exported.providers.anthropic).toEqual({
      selectedModel: "claude-opus-4-8",
    });
    expect(exported.routing.summary).toEqual(["anthropic"]);
    expect(exported.memory.acceptedActions[0]).toContain("Rebuild plan");
  });

  it("import keeps existing on-device keys while applying models/memory", () => {
    const store = useAiStore.getState();
    store.setProvider("anthropic", {
      apiKey: "mykey",
      selectedModel: "claude-opus-4-8",
    });
    store.importAi({
      providers: { anthropic: { selectedModel: "claude-sonnet-5" } },
      order: ["anthropic"],
      routing: {},
      dailyBudgetTokens: 500000,
      conversations: {},
      activeConversationId: null,
      memory: {
        preferences: ["evenings"],
        acceptedActions: [],
        rejectedActions: [],
        pastAdvice: [],
      },
    });
    const providers = useAiStore.getState().providers;
    expect(providers.anthropic?.apiKey).toBe("mykey"); // key retained
    expect(providers.anthropic?.selectedModel).toBe("claude-sonnet-5"); // model applied
    expect(useAiStore.getState().memory.preferences).toEqual(["evenings"]);
  });

  it("sanitizes AI sections and accepts any model id (legacy `model` too)", () => {
    const clean = sanitizeAiExport({
      // Legacy pre-C.1 key `model`, plus a future id via the new key.
      providers: {
        anthropic: { model: "some-future-model" },
        openai: { selectedModel: "gpt-9" },
        bogus: { selectedModel: "x" },
      },
      order: ["anthropic", "not-a-provider"],
      routing: { summary: ["anthropic"], badcap: ["x"] },
      dailyBudgetTokens: -5,
      conversations: {
        c1: {
          title: "T",
          topicId: TOPIC,
          messages: [
            { role: "user", content: "hi", at: "2026-07-06T00:00:00Z" },
            { role: "banana", content: "drop me" },
          ],
        },
      },
      memory: { preferences: ["p"], junk: 1 },
    });
    // No whitelist: any id survives; legacy `model` maps to selectedModel.
    expect(clean.providers.anthropic).toEqual({ selectedModel: "some-future-model" });
    expect(clean.providers.openai).toEqual({ selectedModel: "gpt-9" });
    expect(clean.providers).not.toHaveProperty("bogus");
    expect(clean.order).toEqual(["anthropic"]);
    expect(clean.routing).not.toHaveProperty("badcap");
    expect(clean.dailyBudgetTokens).toBe(AI_CONFIG.defaultDailyBudgetTokens);
    expect(clean.conversations.c1.messages).toHaveLength(1); // bad message dropped
    expect(clean.memory.preferences).toEqual(["p"]);
  });
});

describe("v1 → v2 store migration", () => {
  it("renames `model` to `selectedModel` and drops the obsolete key", () => {
    const migrated = migrateAiV1ToV2({
      providers: {
        anthropic: { apiKey: "k", model: "claude-opus-4-8" },
        openai: { apiKey: "o", model: "gpt-4.1-mini" },
      },
      order: ["anthropic", "openai"],
    }) as { providers: Record<string, Record<string, unknown>> };
    expect(migrated.providers.anthropic.selectedModel).toBe("claude-opus-4-8");
    expect(migrated.providers.anthropic).not.toHaveProperty("model");
    expect(migrated.providers.anthropic.apiKey).toBe("k");
    expect(migrated.providers.openai.selectedModel).toBe("gpt-4.1-mini");
  });

  it("is a no-op for already-migrated (v2) state", () => {
    const state = {
      providers: { gemini: { apiKey: "g", selectedModel: "gemini-2.5-flash" } },
    };
    const migrated = migrateAiV1ToV2(state) as {
      providers: Record<string, Record<string, unknown>>;
    };
    expect(migrated.providers.gemini.selectedModel).toBe("gemini-2.5-flash");
  });
});

describe("backup format v6 (backward compatibility)", () => {
  it("round-trips the AI section through app-store backup", () => {
    useAiStore.getState().setProvider("anthropic", {
      apiKey: "secret",
      selectedModel: "claude-opus-4-8",
    });
    useAiStore.getState().recordActionDecision("Rebuild plan", true);

    const json = exportStateToJSON();
    expect(JSON.parse(json).version).toBe(6);
    expect(json).not.toContain("secret"); // keys excluded from backups

    const parsed = parseExportedState(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.ai?.providers.anthropic).toEqual({
        selectedModel: "claude-opus-4-8",
      });
      expect(parsed.data.ai?.memory.acceptedActions[0]).toContain("Rebuild plan");
    }
  });

  it("accepts older v5 backups with no AI section", () => {
    const v5 = JSON.stringify({
      app: "upsc-os",
      version: 5,
      exportedAt: new Date().toISOString(),
      topics: {},
      displayName: "",
      examDate: "",
      recentTopics: [],
      planner: null,
      tasks: {},
      lastPlannedAt: null,
      snapshots: {},
      focusCollectionId: null,
      knowledge: null,
    });
    const parsed = parseExportedState(v5);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.ai).toBeNull();
    expect(BACKUP_VERSION).toBe(6);
  });
});
