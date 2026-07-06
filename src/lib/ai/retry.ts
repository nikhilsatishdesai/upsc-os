import { AI_CONFIG } from "./config";
import { AiError, type AiErrorKind } from "./types";

/** Which failures are worth retrying on the SAME provider. */
const RETRYABLE: AiErrorKind[] = ["rate-limit", "overloaded", "network"];

export function isRetryable(error: unknown): boolean {
  return error instanceof AiError && RETRYABLE.includes(error.kind);
}

/**
 * Which failures should make the client try the NEXT provider in the
 * chain (after same-provider retries are exhausted where applicable).
 * Budget/abort/config problems are terminal — no provider can fix them.
 */
export function isFallbackWorthy(error: unknown): boolean {
  if (!(error instanceof AiError)) return true;
  return !["budget", "aborted", "not-configured"].includes(error.kind);
}

/**
 * Exponential backoff with full jitter; honours a server Retry-After when
 * it is longer than the computed delay. `random` is injectable for tests.
 */
export function backoffDelayMs(
  attempt: number,
  retryAfterMs: number | null = null,
  random: () => number = Math.random,
): number {
  const cfg = AI_CONFIG.retry;
  const exponential = Math.min(
    cfg.maxDelayMs,
    cfg.baseDelayMs * 2 ** attempt,
  );
  const jittered = Math.round(exponential * (0.5 + random() * 0.5));
  return Math.max(jittered, retryAfterMs ?? 0);
}
