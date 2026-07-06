import { AI_CONFIG, AI_PROVIDERS } from "./config";
import type { AiProviderId, AiRequest } from "./types";

/**
 * Cheap deterministic token estimation (chars ÷ 4, provider-corrected).
 * Used to trim context to budget, feed the daily budget guard and show
 * cost estimates. Providers that report real usage override these numbers
 * in the usage tracker after the fact.
 */
export function estimateTokens(
  text: string,
  provider: AiProviderId | null = null,
): number {
  if (text.length === 0) return 0;
  const factor = provider ? AI_PROVIDERS[provider].tokenFactor : 1;
  return Math.max(1, Math.ceil((text.length / AI_CONFIG.charsPerToken) * factor));
}

/** Estimated input tokens of a full request (system + all turns). */
export function estimateRequestTokens(
  request: AiRequest,
  provider: AiProviderId | null = null,
): number {
  let chars = request.system.length;
  for (const turn of request.messages) chars += turn.content.length;
  if (chars === 0) return 0;
  const factor = provider ? AI_PROVIDERS[provider].tokenFactor : 1;
  return Math.max(1, Math.ceil((chars / AI_CONFIG.charsPerToken) * factor));
}

/**
 * Trim text to fit a token budget, cutting at a line boundary where
 * possible so markdown context stays readable. Deterministic.
 */
const TRIM_MARKER = "\n… [trimmed to fit context budget]";

export function trimToTokenBudget(text: string, budgetTokens: number): string {
  if (budgetTokens <= 0) return "";
  const fullChars = budgetTokens * AI_CONFIG.charsPerToken;
  if (text.length <= fullChars) return text;
  // Reserve room for the marker so the trimmed result still fits the budget.
  const markerTokens = estimateTokens(TRIM_MARKER);
  const maxChars = Math.max(
    AI_CONFIG.charsPerToken,
    (budgetTokens - markerTokens) * AI_CONFIG.charsPerToken,
  );
  const slice = text.slice(0, maxChars);
  const lastBreak = slice.lastIndexOf("\n");
  const cut = lastBreak > maxChars * 0.5 ? slice.slice(0, lastBreak) : slice;
  return `${cut}${TRIM_MARKER}`;
}
