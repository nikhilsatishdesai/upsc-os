import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { makeId } from "@/lib/id";
import { AI_CONFIG } from "@/lib/ai/config";
import {
  cacheGet,
  cachePrune,
  cachePut,
  cacheTouch,
  type AiCacheEntry,
  type AiCacheMap,
} from "@/lib/ai/cache";
import {
  appendMessage as appendMessagePure,
  applySummary,
  createConversation as createConversationPure,
  EMPTY_MENTOR_MEMORY,
  rememberAdvice,
  rememberDecision,
  rememberPreference,
  type AiChatMessage,
  type AiConversation,
  type MentorMemory,
} from "@/lib/ai/memory";
import {
  isAiCapability,
  isAiProviderId,
  type AiCapability,
  type AiClientConfig,
  type AiProviderId,
  type AiProvidersConfig,
  type AiUsageRecord,
} from "@/lib/ai/types";
import { getNode } from "@/lib/syllabus";

export const AI_STORE_VERSION = 2;

/**
 * v1 → v2: the provider setting `model` (a plain string) became
 * `selectedModel`, and providers gained optional `lastRefresh` /
 * `availableModels`. The old value is a model id string already, so the
 * migration just carries it across and drops the obsolete `model` key —
 * no user intervention, existing model choices preserved.
 */
export function migrateAiV1ToV2(persisted: unknown): unknown {
  if (typeof persisted !== "object" || persisted === null) return persisted;
  const state = persisted as Record<string, unknown>;
  const rawProviders = state.providers;
  if (typeof rawProviders !== "object" || rawProviders === null) return state;
  const providers: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(
    rawProviders as Record<string, unknown>,
  )) {
    if (typeof value !== "object" || value === null) continue;
    const provider = value as Record<string, unknown>;
    const legacyModel =
      typeof provider.selectedModel === "string"
        ? provider.selectedModel
        : typeof provider.model === "string"
          ? provider.model
          : "";
    providers[id] = {
      apiKey: typeof provider.apiKey === "string" ? provider.apiKey : "",
      selectedModel: legacyModel,
      ...(Array.isArray(provider.availableModels)
        ? { availableModels: provider.availableModels }
        : {}),
      ...(typeof provider.lastRefresh === "string"
        ? { lastRefresh: provider.lastRefresh }
        : {}),
    };
  }
  return { ...state, providers };
}

/** One line in the "Recent AI activity" feed (features run, actions taken). */
export type AiActivityEntry = {
  id: string;
  /** ISO timestamp. */
  at: string;
  kind: "feature" | "action";
  label: string;
  detail: string;
  ok: boolean;
};

/** The backup-file AI section. API keys are NEVER exported — backups get
 * shared/synced; keys stay on this device only. */
export type AiExport = {
  /** Provider settings with keys stripped (model choices survive). */
  providers: Partial<Record<AiProviderId, { selectedModel: string }>>;
  order: AiProviderId[];
  routing: Partial<Record<AiCapability, AiProviderId[]>>;
  dailyBudgetTokens: number;
  conversations: Record<string, AiConversation>;
  activeConversationId: string | null;
  memory: MentorMemory;
};

type AiState = {
  providers: AiProvidersConfig;
  order: AiProviderId[];
  routing: Partial<Record<AiCapability, AiProviderId[]>>;
  dailyBudgetTokens: number;
  /** Cost-manager raw data, newest first, capped. */
  usage: AiUsageRecord[];
  /** Content-addressed response cache (LRU, capped). */
  cache: AiCacheMap;
  conversations: Record<string, AiConversation>;
  activeConversationId: string | null;
  memory: MentorMemory;
  activity: AiActivityEntry[];

  setProvider: (
    id: AiProviderId,
    settings: { apiKey: string; selectedModel: string },
  ) => void;
  /** Update only the chosen model id (any free-form string). */
  setProviderModel: (id: AiProviderId, selectedModel: string) => void;
  /** Cache the ids returned by a "Refresh models" fetch (convenience only;
   * never required for a typed model to work). */
  cacheProviderModels: (id: AiProviderId, availableModels: string[]) => void;
  removeProvider: (id: AiProviderId) => void;
  setProviderOrder: (order: AiProviderId[]) => void;
  setRouting: (capability: AiCapability, order: AiProviderId[] | null) => void;
  setDailyBudget: (tokens: number) => void;

  recordUsage: (record: AiUsageRecord) => void;
  getCached: (key: string) => AiCacheEntry | null;
  putCached: (key: string, entry: AiCacheEntry) => void;
  clearCache: () => void;

  startConversation: (topicId: string | null, title: string) => string;
  appendMessage: (conversationId: string, message: AiChatMessage) => void;
  setConversationSummary: (
    conversationId: string,
    summary: string,
    coveredThrough: number,
  ) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;

  addPreference: (preference: string) => void;
  recordActionDecision: (description: string, accepted: boolean) => void;
  recordAdvice: (advice: string) => void;
  logActivity: (entry: Omit<AiActivityEntry, "id" | "at">) => void;

  importAi: (data: AiExport) => void;
  resetAi: () => void;
};

const initialData = () => ({
  providers: {} as AiProvidersConfig,
  order: [...AI_CONFIG.defaultOrder],
  routing: {} as Partial<Record<AiCapability, AiProviderId[]>>,
  dailyBudgetTokens: AI_CONFIG.defaultDailyBudgetTokens,
  usage: [] as AiUsageRecord[],
  cache: {} as AiCacheMap,
  conversations: {} as Record<string, AiConversation>,
  activeConversationId: null as string | null,
  memory: EMPTY_MENTOR_MEMORY,
  activity: [] as AiActivityEntry[],
});

export const useAiStore = create<AiState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      setProvider: (id, settings) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: {
              ...state.providers[id],
              apiKey: settings.apiKey.trim(),
              selectedModel: settings.selectedModel.trim(),
            },
          },
        })),

      setProviderModel: (id, selectedModel) =>
        set((state) => {
          const existing = state.providers[id];
          if (!existing) return state;
          return {
            providers: {
              ...state.providers,
              [id]: { ...existing, selectedModel: selectedModel.trim() },
            },
          };
        }),

      cacheProviderModels: (id, availableModels) =>
        set((state) => {
          const existing = state.providers[id];
          if (!existing) return state;
          return {
            providers: {
              ...state.providers,
              [id]: {
                ...existing,
                availableModels,
                lastRefresh: new Date().toISOString(),
              },
            },
          };
        }),

      removeProvider: (id) =>
        set((state) => {
          const providers = { ...state.providers };
          delete providers[id];
          return { providers };
        }),

      setProviderOrder: (order) =>
        set(() => ({
          order: order.filter(isAiProviderId),
        })),

      setRouting: (capability, order) =>
        set((state) => {
          const routing = { ...state.routing };
          if (order === null) delete routing[capability];
          else routing[capability] = order.filter(isAiProviderId);
          return { routing };
        }),

      setDailyBudget: (tokens) =>
        set(() => ({
          dailyBudgetTokens: Math.max(0, Math.round(tokens)),
        })),

      recordUsage: (record) =>
        set((state) => ({
          usage: [record, ...state.usage].slice(0, AI_CONFIG.usageLogCap),
        })),

      getCached: (key) => {
        const state = get();
        const hit = cacheGet(state.cache, key, Date.now(), AI_CONFIG.cache.ttlMs);
        if (hit) {
          set((current) => ({
            cache: cacheTouch(current.cache, key, Date.now()),
          }));
        }
        return hit;
      },

      putCached: (key, entry) =>
        set((state) => ({
          cache: cachePut(
            cachePrune(state.cache, Date.now(), AI_CONFIG.cache.ttlMs),
            key,
            entry,
            AI_CONFIG.cache.maxEntries,
          ),
        })),

      clearCache: () => set({ cache: {} }),

      startConversation: (topicId, title) => {
        const id = makeId("cv");
        set((state) => {
          const conversations = {
            ...state.conversations,
            [id]: createConversationPure(
              id,
              title,
              topicId,
              new Date().toISOString(),
            ),
          };
          // Cap: drop the oldest-updated conversations beyond the limit.
          const ids = Object.keys(conversations);
          if (ids.length > AI_CONFIG.memory.conversationCap) {
            ids.sort((a, b) =>
              conversations[a].updatedAt.localeCompare(conversations[b].updatedAt),
            );
            for (const stale of ids.slice(
              0,
              ids.length - AI_CONFIG.memory.conversationCap,
            )) {
              delete conversations[stale];
            }
          }
          return { conversations, activeConversationId: id };
        });
        return id;
      },

      appendMessage: (conversationId, message) =>
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: appendMessagePure(conversation, message),
            },
          };
        }),

      setConversationSummary: (conversationId, summary, coveredThrough) =>
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: applySummary(conversation, summary, coveredThrough),
            },
          };
        }),

      renameConversation: (conversationId, title) =>
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (!conversation || title.trim() === "") return state;
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: { ...conversation, title: title.trim() },
            },
          };
        }),

      deleteConversation: (conversationId) =>
        set((state) => {
          const conversations = { ...state.conversations };
          delete conversations[conversationId];
          return {
            conversations,
            activeConversationId:
              state.activeConversationId === conversationId
                ? null
                : state.activeConversationId,
          };
        }),

      setActiveConversation: (conversationId) =>
        set({ activeConversationId: conversationId }),

      addPreference: (preference) =>
        set((state) => ({
          memory: rememberPreference(state.memory, preference),
        })),

      recordActionDecision: (description, accepted) =>
        set((state) => ({
          memory: rememberDecision(
            state.memory,
            description,
            accepted,
            new Date().toISOString().slice(0, 10),
          ),
        })),

      recordAdvice: (advice) =>
        set((state) => ({
          memory: rememberAdvice(
            state.memory,
            advice,
            new Date().toISOString().slice(0, 10),
          ),
        })),

      logActivity: (entry) =>
        set((state) => ({
          activity: [
            { ...entry, id: makeId("act"), at: new Date().toISOString() },
            ...state.activity,
          ].slice(0, AI_CONFIG.activityLogCap),
        })),

      importAi: (data) =>
        set((state) => ({
          // Keys are never in backups; keep any keys already on this
          // device for providers the backup also knows about.
          providers: Object.fromEntries(
            Object.entries(data.providers).map(([id, settings]) => [
              id,
              {
                apiKey: state.providers[id as AiProviderId]?.apiKey ?? "",
                selectedModel: settings.selectedModel,
              },
            ]),
          ) as AiProvidersConfig,
          order: data.order,
          routing: data.routing,
          dailyBudgetTokens: data.dailyBudgetTokens,
          conversations: data.conversations,
          activeConversationId: data.activeConversationId,
          memory: data.memory,
        })),

      resetAi: () => set({ ...initialData() }),
    }),
    {
      name: "upsc-os-ai",
      version: AI_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) =>
        version < 2 ? migrateAiV1ToV2(persisted) : persisted,
      partialize: (state) => ({
        providers: state.providers,
        order: state.order,
        routing: state.routing,
        dailyBudgetTokens: state.dailyBudgetTokens,
        usage: state.usage,
        cache: state.cache,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        memory: state.memory,
        activity: state.activity,
      }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

/** Client-config snapshot for the AI client. */
export function aiClientConfig(state: {
  providers: AiProvidersConfig;
  order: AiProviderId[];
  routing: Partial<Record<AiCapability, AiProviderId[]>>;
  dailyBudgetTokens: number;
}): AiClientConfig {
  return {
    providers: state.providers,
    order: state.order,
    routing: state.routing,
    dailyBudgetTokens: state.dailyBudgetTokens,
  };
}

/** True when at least one provider has a key. */
export function aiConfigured(providers: AiProvidersConfig): boolean {
  return Object.values(providers).some(
    (settings) => (settings?.apiKey ?? "") !== "",
  );
}

/** Estimated tokens spent today (budget-guard input). */
export function usedTokensToday(
  usage: AiUsageRecord[],
  todayPrefix = new Date().toISOString().slice(0, 10),
): number {
  let total = 0;
  for (const record of usage) {
    if (!record.at.startsWith(todayPrefix)) break; // newest-first list
    total += record.inputTokens + record.outputTokens;
  }
  return total;
}

export type AiUsageSummary = {
  requests: number;
  failures: number;
  cacheHits: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  averageMs: number;
  byProvider: Partial<
    Record<AiProviderId, { requests: number; estimatedCostUsd: number }>
  >;
};

/** Aggregate the usage log for the Settings cost panel. */
export function summarizeUsage(usage: AiUsageRecord[]): AiUsageSummary {
  const summary: AiUsageSummary = {
    requests: 0,
    failures: 0,
    cacheHits: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    averageMs: 0,
    byProvider: {},
  };
  let msTotal = 0;
  let msCount = 0;
  for (const record of usage) {
    summary.requests += 1;
    if (!record.ok) summary.failures += 1;
    if (record.cached) summary.cacheHits += 1;
    summary.inputTokens += record.inputTokens;
    summary.outputTokens += record.outputTokens;
    summary.estimatedCostUsd += record.estimatedCostUsd;
    if (record.ok && !record.cached) {
      msTotal += record.durationMs;
      msCount += 1;
    }
    const bucket = (summary.byProvider[record.provider] ??= {
      requests: 0,
      estimatedCostUsd: 0,
    });
    bucket.requests += 1;
    bucket.estimatedCostUsd += record.estimatedCostUsd;
  }
  summary.averageMs = msCount === 0 ? 0 : Math.round(msTotal / msCount);
  return summary;
}

/* ------------------------------------------------------------------ */
/* Backup export / import                                              */
/* ------------------------------------------------------------------ */

/** Snapshot the AI section for backup files (keys excluded by design). */
export function exportAi(): AiExport {
  const state = useAiStore.getState();
  return {
    providers: Object.fromEntries(
      Object.entries(state.providers).map(([id, settings]) => [
        id,
        { selectedModel: settings?.selectedModel ?? "" },
      ]),
    ),
    order: state.order,
    routing: state.routing,
    dailyBudgetTokens: state.dailyBudgetTokens,
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    memory: state.memory,
  };
}

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const strList = (value: unknown, cap: number): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .slice(0, cap)
    : [];

function sanitizeMessage(raw: unknown): AiChatMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const m = raw as Record<string, unknown>;
  if (
    (m.role !== "user" && m.role !== "assistant") ||
    typeof m.content !== "string" ||
    m.content === ""
  )
    return null;
  return {
    id: str(m.id, makeId("msg")),
    role: m.role,
    content: m.content,
    at: str(m.at, new Date(0).toISOString()),
    ...(isAiProviderId(m.provider) ? { provider: m.provider } : {}),
  };
}

/** Validate an AI backup section — drop-don't-throw, like every other
 * sanitizer in the app. */
export function sanitizeAiExport(raw: unknown): AiExport {
  const empty: AiExport = {
    providers: {},
    order: [...AI_CONFIG.defaultOrder],
    routing: {},
    dailyBudgetTokens: AI_CONFIG.defaultDailyBudgetTokens,
    conversations: {},
    activeConversationId: null,
    memory: EMPTY_MENTOR_MEMORY,
  };
  if (typeof raw !== "object" || raw === null) return empty;
  const source = raw as Record<string, unknown>;

  const providers: AiExport["providers"] = {};
  if (typeof source.providers === "object" && source.providers !== null) {
    for (const [id, value] of Object.entries(
      source.providers as Record<string, unknown>,
    )) {
      if (!isAiProviderId(id) || typeof value !== "object" || value === null)
        continue;
      const settings = value as Record<string, unknown>;
      // Accept any model id verbatim (no whitelist). Read the new field,
      // falling back to the legacy `model` key from pre-C.1 backups.
      const selectedModel = str(settings.selectedModel, str(settings.model));
      providers[id] = { selectedModel };
    }
  }

  const order = Array.isArray(source.order)
    ? source.order.filter(isAiProviderId)
    : [];

  const routing: AiExport["routing"] = {};
  if (typeof source.routing === "object" && source.routing !== null) {
    for (const [capability, value] of Object.entries(
      source.routing as Record<string, unknown>,
    )) {
      if (!isAiCapability(capability) || !Array.isArray(value)) continue;
      const providersList = value.filter(isAiProviderId);
      if (providersList.length > 0) routing[capability] = providersList;
    }
  }

  const conversations: Record<string, AiConversation> = {};
  if (
    typeof source.conversations === "object" &&
    source.conversations !== null
  ) {
    for (const [id, value] of Object.entries(
      source.conversations as Record<string, unknown>,
    )) {
      if (typeof value !== "object" || value === null) continue;
      const c = value as Record<string, unknown>;
      const messages = Array.isArray(c.messages)
        ? c.messages
            .map(sanitizeMessage)
            .filter((message): message is AiChatMessage => message !== null)
            .slice(-AI_CONFIG.memory.messagesPerConversationCap)
        : [];
      const topicId =
        typeof c.topicId === "string" && getNode(c.topicId) ? c.topicId : null;
      conversations[id] = {
        id,
        title: str(c.title, "Conversation"),
        topicId,
        createdAt: str(c.createdAt, new Date(0).toISOString()),
        updatedAt: str(c.updatedAt, new Date(0).toISOString()),
        messages,
        summary: str(c.summary),
        summarizedCount: Math.min(
          typeof c.summarizedCount === "number" && c.summarizedCount >= 0
            ? Math.round(c.summarizedCount)
            : 0,
          messages.length,
        ),
      };
    }
  }

  const memorySource = (source.memory ?? {}) as Record<string, unknown>;
  const cap = AI_CONFIG.memory.memoryItemsCap;

  return {
    providers,
    order: order.length > 0 ? order : [...AI_CONFIG.defaultOrder],
    routing,
    dailyBudgetTokens:
      typeof source.dailyBudgetTokens === "number" &&
      source.dailyBudgetTokens >= 0
        ? Math.round(source.dailyBudgetTokens)
        : AI_CONFIG.defaultDailyBudgetTokens,
    conversations,
    activeConversationId:
      typeof source.activeConversationId === "string" &&
      conversations[source.activeConversationId]
        ? source.activeConversationId
        : null,
    memory: {
      preferences: strList(memorySource.preferences, cap),
      acceptedActions: strList(memorySource.acceptedActions, cap),
      rejectedActions: strList(memorySource.rejectedActions, cap),
      pastAdvice: strList(memorySource.pastAdvice, cap),
    },
  };
}
