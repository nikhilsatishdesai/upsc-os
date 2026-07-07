import {
  AI_CONFIG,
  AI_PROVIDERS,
  fallbackModel,
  providerPricing,
} from "./config";
import { cacheKey, type AiCacheEntry } from "./cache";
import { getProviderAdapter } from "./providers";
import { backoffDelayMs, isFallbackWorthy, isRetryable } from "./retry";
import { estimateRequestTokens } from "./tokens";
import {
  AiError,
  type AiCapability,
  type AiClientConfig,
  type AiFeature,
  type AiModelListItem,
  type AiProviderAdapter,
  type AiProviderId,
  type AiRequest,
  type AiResponse,
  type AiStreamHandlers,
  type AiUsageRecord,
} from "./types";

/**
 * The provider-agnostic AI client — the single gate between UPSC OS and
 * any AI vendor. Responsibilities (docs/API_ABSTRACTION.md §4):
 * routing by capability, fallback chains, retry with backoff, response
 * caching, client-side rate limiting, a daily budget guard, streaming
 * unification and usage tracking. UI code never touches providers.
 */

export type AiClientDeps = {
  /** Live configuration snapshot (providers, order, routing, budget). */
  getConfig: () => AiClientConfig;
  /** Response cache hooks (persisted by the AI store). Optional. */
  cache?: {
    get: (key: string) => AiCacheEntry | null;
    put: (key: string, entry: AiCacheEntry) => void;
  };
  /** Usage tracker sink (the AI cost manager). Optional. */
  onUsage?: (record: AiUsageRecord) => void;
  /** Estimated tokens already spent today (budget guard input). */
  usedTokensToday?: () => number;
  /* Injectables for testing — production uses the real ones. */
  fetchImpl?: typeof fetch;
  adapters?: Partial<Record<AiProviderId, AiProviderAdapter>>;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export type AiRunOptions = {
  feature: AiFeature;
  /** Routing lane; defaults to the feature's configured capability. */
  capability?: AiCapability;
  /** Included in the cache key so prompt upgrades invalidate cleanly. */
  promptVersion?: string;
  /** Opt IN to caching (deterministic features only — never chat). */
  cache?: boolean;
  /** Force a fresh call even when a cached answer exists ("Regenerate"). */
  bypassCache?: boolean;
  /** Interactive requests skip the polite rate-limit wait. */
  interactive?: boolean;
  signal?: AbortSignal;
};

export type ResolvedProvider = {
  provider: AiProviderId;
  model: string;
};

export type AiClient = {
  isConfigured: () => boolean;
  configuredProviders: () => AiProviderId[];
  /** The provider+model that would serve a capability right now. */
  resolveChain: (capability: AiCapability) => ResolvedProvider[];
  request: (request: AiRequest, options: AiRunOptions) => Promise<AiResponse>;
  stream: (
    request: AiRequest,
    handlers: AiStreamHandlers,
    options: AiRunOptions,
  ) => Promise<AiResponse>;
  /** Fetch the models a provider currently exposes for its configured key.
   * Rejects with a typed AiError (not-configured / auth / network / …) so
   * the UI can fall back to manual entry gracefully. */
  listModels: (
    provider: AiProviderId,
    signal?: AbortSignal,
  ) => Promise<AiModelListItem[]>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createAiClient(deps: AiClientDeps): AiClient {
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  const sleep = deps.sleep ?? defaultSleep;
  const fetchImpl = deps.fetchImpl ?? fetch;

  /** Sliding-window request timestamps per provider (rate limiting). */
  const recentRequests: Record<string, number[]> = {};

  function adapterFor(id: AiProviderId): AiProviderAdapter {
    return deps.adapters?.[id] ?? getProviderAdapter(id);
  }

  function configuredProviders(): AiProviderId[] {
    const config = deps.getConfig();
    const order =
      config.order.length > 0 ? config.order : AI_CONFIG.defaultOrder;
    return order.filter((id) => (config.providers[id]?.apiKey ?? "") !== "");
  }

  function resolveChain(capability: AiCapability): ResolvedProvider[] {
    const config = deps.getConfig();
    const preferred =
      config.routing[capability] ??
      AI_CONFIG.defaultRouting[capability] ??
      AI_CONFIG.defaultOrder;
    const configured = new Set(configuredProviders());
    const chain: ResolvedProvider[] = [];
    const seen = new Set<AiProviderId>();
    // Capability preference first, then any remaining configured provider
    // so a single-provider setup always works for every feature.
    for (const id of [...preferred, ...configuredProviders()]) {
      if (seen.has(id) || !configured.has(id)) continue;
      seen.add(id);
      const settings = config.providers[id];
      chain.push({
        provider: id,
        // The user's typed model wins verbatim; a blank falls back to the
        // provider's single seed so a fresh key still works out of the box.
        model:
          settings && settings.selectedModel.trim() !== ""
            ? settings.selectedModel.trim()
            : fallbackModel(id),
      });
    }
    return chain;
  }

  function guardBudget(request: AiRequest): void {
    const config = deps.getConfig();
    const budget = config.dailyBudgetTokens;
    if (budget <= 0) return; // 0 = unlimited
    const used = deps.usedTokensToday?.() ?? 0;
    const upcoming = estimateRequestTokens(request) + request.maxTokens;
    if (used + upcoming > budget) {
      throw new AiError(
        "budget",
        "Daily AI budget reached — the limit resets tomorrow (adjust it in Settings → AI).",
      );
    }
  }

  /** Wait politely if this provider was called too often this minute. */
  async function rateLimit(
    provider: AiProviderId,
    interactive: boolean,
  ): Promise<void> {
    const limit = AI_PROVIDERS[provider].requestsPerMinute;
    const windowMs = 60_000;
    const current = now();
    const stamps = (recentRequests[provider] ?? []).filter(
      (at) => current - at < windowMs,
    );
    if (!interactive && stamps.length >= limit) {
      const waitMs = windowMs - (current - stamps[0]);
      if (waitMs > 0) await sleep(waitMs);
    }
    stamps.push(now());
    recentRequests[provider] = stamps;
  }

  function recordUsage(
    partial: Omit<AiUsageRecord, "at" | "estimatedCostUsd">,
  ): void {
    if (!deps.onUsage) return;
    const pricing = providerPricing(partial.provider);
    deps.onUsage({
      ...partial,
      at: new Date(now()).toISOString(),
      estimatedCostUsd:
        (partial.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
        (partial.outputTokens / 1_000_000) * pricing.outputUsdPerMTok,
    });
  }

  /** Run one provider with same-provider retries. */
  async function runProvider(
    resolved: ResolvedProvider,
    request: AiRequest,
    options: AiRunOptions,
    onDelta: ((text: string) => void) | null,
  ): Promise<AiResponse> {
    const config = deps.getConfig();
    const settings = config.providers[resolved.provider];
    if (!settings) {
      throw new AiError("not-configured", `${resolved.provider} is not configured.`);
    }
    const adapter = adapterFor(resolved.provider);
    const started = now();
    let lastError: AiError = new AiError(
      "network",
      `${resolved.provider}: no attempt made.`,
    );

    for (let attempt = 0; attempt < AI_CONFIG.retry.attempts; attempt++) {
      if (attempt > 0) {
        await sleep(backoffDelayMs(attempt - 1, lastError.retryAfterMs, random));
      }
      await rateLimit(resolved.provider, options.interactive ?? false);
      try {
        const providerSettings = {
          apiKey: settings.apiKey,
          model: resolved.model,
        };
        const response = onDelta
          ? await adapter.stream(
              providerSettings,
              request,
              onDelta,
              fetchImpl,
              options.signal,
            )
          : await adapter.complete(
              providerSettings,
              request,
              fetchImpl,
              options.signal,
            );
        recordUsage({
          provider: resolved.provider,
          model: response.model,
          feature: options.feature,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          durationMs: Math.max(0, now() - started),
          ok: true,
          cached: false,
          error: null,
        });
        return response;
      } catch (error) {
        lastError =
          error instanceof AiError
            ? error
            : new AiError("network", String(error), {
                provider: resolved.provider,
              });
        if (lastError.kind === "aborted" || !isRetryable(lastError)) break;
      }
    }

    recordUsage({
      provider: resolved.provider,
      model: resolved.model,
      feature: options.feature,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Math.max(0, now() - started),
      ok: false,
      cached: false,
      error: lastError.kind,
    });
    throw lastError;
  }

  /** Shared execution path for request() and stream(). */
  async function run(
    request: AiRequest,
    options: AiRunOptions,
    handlers: AiStreamHandlers | null,
  ): Promise<AiResponse> {
    const capability =
      options.capability ?? AI_CONFIG.featureCapability[options.feature];
    const chain = resolveChain(capability);
    if (chain.length === 0) {
      throw new AiError(
        "not-configured",
        "No AI provider is configured. Add an API key in Settings → AI.",
      );
    }

    // Cache lookup keyed on the FIRST provider in the chain so a stable
    // configuration gets stable keys.
    const key =
      options.cache && deps.cache
        ? cacheKey(
            chain[0].provider,
            chain[0].model,
            options.promptVersion ?? "0",
            request,
          )
        : null;
    if (key && !options.bypassCache) {
      const hit = deps.cache!.get(key);
      if (hit) {
        const response: AiResponse = {
          text: hit.text,
          usage: {
            inputTokens: hit.inputTokens,
            outputTokens: hit.outputTokens,
          },
          model: hit.model,
          provider: hit.provider,
          cached: true,
        };
        recordUsage({
          provider: hit.provider,
          model: hit.model,
          feature: options.feature,
          inputTokens: 0,
          outputTokens: 0,
          durationMs: 0,
          ok: true,
          cached: true,
          error: null,
        });
        // Streaming callers still get their deltas (one emulated chunk).
        handlers?.onDelta(response.text);
        handlers?.onDone?.(response);
        return response;
      }
    }

    guardBudget(request);

    let lastError: AiError = new AiError("not-configured", "No provider ran.");
    for (const resolved of chain) {
      try {
        const response = await runProvider(
          resolved,
          request,
          options,
          handlers ? handlers.onDelta : null,
        );
        if (key) {
          deps.cache!.put(key, {
            text: response.text,
            model: response.model,
            provider: response.provider,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            createdAt: new Date(now()).toISOString(),
            lastUsedAt: new Date(now()).toISOString(),
          });
        }
        handlers?.onDone?.(response);
        return response;
      } catch (error) {
        lastError =
          error instanceof AiError ? error : new AiError("network", String(error));
        if (!isFallbackWorthy(lastError)) break;
        // Streaming fallback caveat: if deltas already reached the UI we
        // cannot cleanly restart on another provider — surface the error.
        if (handlers && lastError.kind === "content") break;
      }
    }
    handlers?.onError?.(lastError);
    throw lastError;
  }

  async function listModels(
    provider: AiProviderId,
    signal?: AbortSignal,
  ): Promise<AiModelListItem[]> {
    const config = deps.getConfig();
    const settings = config.providers[provider];
    if (!settings || settings.apiKey === "") {
      throw new AiError(
        "not-configured",
        `Add an API key for ${AI_PROVIDERS[provider].label} first.`,
        { provider },
      );
    }
    const adapter = adapterFor(provider);
    if (!adapter.listModels) {
      throw new AiError(
        "bad-request",
        `${AI_PROVIDERS[provider].label} does not expose a model list.`,
        { provider },
      );
    }
    const models = await adapter.listModels(
      { apiKey: settings.apiKey },
      fetchImpl,
      signal,
    );
    return [...models].sort((a, b) => a.id.localeCompare(b.id));
  }

  return {
    isConfigured: () => configuredProviders().length > 0,
    configuredProviders,
    resolveChain,
    request: (request, options) => run(request, options, null),
    stream: (request, handlers, options) => run(request, options, handlers),
    listModels,
  };
}
