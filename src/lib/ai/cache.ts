import type { AiRequest, AiResponse } from "./types";

/**
 * Content-addressed response cache — pure logic only. Persistence lives in
 * the AI store; these functions operate immutably on a plain record so
 * they slot into zustand updates and unit tests alike.
 *
 * Key = hash(provider, model, prompt version, full request). A changed
 * note, prompt version bump or different provider all produce a new key,
 * which is the "invalidate intelligently" rule: cache entries are never
 * stale because the key IS the content.
 */

export type AiCacheEntry = {
  /** The cached response text. */
  text: string;
  model: string;
  provider: AiResponse["provider"];
  inputTokens: number;
  outputTokens: number;
  /** ISO — when the entry was written. */
  createdAt: string;
  /** ISO — last read (drives LRU eviction). */
  lastUsedAt: string;
};

export type AiCacheMap = Record<string, AiCacheEntry>;

/** FNV-1a 32-bit, hex — applied twice with different seeds for 64 bits of
 * key space (plenty for a personal cache; not cryptographic). */
function fnv1a(text: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function hashContent(text: string): string {
  return fnv1a(text, 0x811c9dc5) + fnv1a(text, 0x811c9dc4);
}

/** Deterministic cache key for one request against one provider+model. */
export function cacheKey(
  provider: string,
  model: string,
  promptVersion: string,
  request: AiRequest,
): string {
  const material = JSON.stringify([
    provider,
    model,
    promptVersion,
    request.system,
    request.messages,
    request.maxTokens,
    request.temperature ?? null,
    request.json ?? false,
  ]);
  return hashContent(material);
}

/** Read an entry (null when absent or expired). Does not mutate. */
export function cacheGet(
  cache: AiCacheMap,
  key: string,
  nowMs: number,
  ttlMs: number,
): AiCacheEntry | null {
  const entry = cache[key];
  if (!entry) return null;
  if (nowMs - new Date(entry.createdAt).getTime() > ttlMs) return null;
  return entry;
}

/** Return a new map with the entry's lastUsedAt refreshed. */
export function cacheTouch(
  cache: AiCacheMap,
  key: string,
  nowMs: number,
): AiCacheMap {
  const entry = cache[key];
  if (!entry) return cache;
  return {
    ...cache,
    [key]: { ...entry, lastUsedAt: new Date(nowMs).toISOString() },
  };
}

/** Return a new map with the entry written and LRU-evicted to the cap. */
export function cachePut(
  cache: AiCacheMap,
  key: string,
  entry: AiCacheEntry,
  maxEntries: number,
): AiCacheMap {
  const next: AiCacheMap = { ...cache, [key]: entry };
  const keys = Object.keys(next);
  if (keys.length <= maxEntries) return next;
  keys.sort(
    (a, b) =>
      new Date(next[a].lastUsedAt).getTime() -
      new Date(next[b].lastUsedAt).getTime(),
  );
  for (const stale of keys.slice(0, keys.length - maxEntries)) {
    delete next[stale];
  }
  return next;
}

/** Drop expired entries (called opportunistically on writes). */
export function cachePrune(
  cache: AiCacheMap,
  nowMs: number,
  ttlMs: number,
): AiCacheMap {
  const entries = Object.entries(cache).filter(
    ([, entry]) => nowMs - new Date(entry.createdAt).getTime() <= ttlMs,
  );
  if (entries.length === Object.keys(cache).length) return cache;
  return Object.fromEntries(entries);
}
