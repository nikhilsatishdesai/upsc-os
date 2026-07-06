import type { AiProviderAdapter, AiProviderId } from "../types";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { openAiAdapter } from "./openai";

/**
 * The provider registry. Adding a vendor = write one adapter file, add a
 * line here and a config entry in ai/config.ts — nothing else changes.
 */
export const PROVIDER_ADAPTERS: Record<AiProviderId, AiProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openAiAdapter,
  gemini: geminiAdapter,
};

export function getProviderAdapter(id: AiProviderId): AiProviderAdapter {
  return PROVIDER_ADAPTERS[id];
}
