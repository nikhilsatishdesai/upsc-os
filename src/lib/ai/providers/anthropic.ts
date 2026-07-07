import {
  AiError,
  type AiModelListItem,
  type AiProviderAdapter,
  type AiRequest,
  type AiResponse,
} from "../types";
import { parseJson, readSseStream, safeFetch } from "./http";

/**
 * Anthropic Messages API adapter (raw fetch — no SDK, per the provider
 * abstraction rule). Runs directly from the browser using the documented
 * `anthropic-dangerous-direct-browser-access` header; keys never leave
 * the user's device except to Anthropic itself (local-first constraint).
 *
 * Vendor quirks absorbed here:
 * - system prompt is a top-level field, not a message;
 * - current models reject sampling params → temperature is NOT sent;
 * - JSON mode has no simple switch → enforced via system instruction;
 * - refusal stop reason → typed "content" error.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODELS_URL = "https://api.anthropic.com/v1/models?limit=1000";
const API_VERSION = "2023-06-01";

const JSON_INSTRUCTION =
  "\n\nRespond with valid JSON only — no prose, no markdown code fences.";

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": API_VERSION,
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

function buildBody(model: string, request: AiRequest, stream: boolean) {
  return {
    model,
    max_tokens: request.maxTokens,
    system: request.json
      ? request.system + JSON_INSTRUCTION
      : request.system,
    messages: request.messages.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    ...(stream ? { stream: true } : {}),
  };
}

type AnthropicUsage = { input_tokens?: number; output_tokens?: number };

export const anthropicAdapter: AiProviderAdapter = {
  id: "anthropic",

  async complete(settings, request, fetchImpl, signal) {
    const response = await safeFetch("anthropic", fetchImpl, API_URL, {
      method: "POST",
      headers: headers(settings.apiKey),
      body: JSON.stringify(buildBody(settings.model, request, false)),
      signal,
    });
    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
      usage?: AnthropicUsage;
      model?: string;
      stop_reason?: string;
    };
    if (data.stop_reason === "refusal") {
      throw new AiError("content", "anthropic: the model declined this request.", {
        provider: "anthropic",
      });
    }
    const text = (data.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string)
      .join("");
    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
      model: data.model ?? settings.model,
      provider: "anthropic",
      cached: false,
    } satisfies AiResponse;
  },

  async stream(settings, request, onDelta, fetchImpl, signal) {
    const response = await safeFetch("anthropic", fetchImpl, API_URL, {
      method: "POST",
      headers: headers(settings.apiKey),
      body: JSON.stringify(buildBody(settings.model, request, true)),
      signal,
    });

    let text = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let model = settings.model;
    let refused = false;

    await readSseStream("anthropic", response, (payload) => {
      const event = parseJson(payload) as {
        type?: string;
        message?: { model?: string; usage?: AnthropicUsage };
        delta?: { type?: string; text?: string; stop_reason?: string };
        usage?: AnthropicUsage;
        error?: { message?: string };
      } | null;
      if (!event) return;
      switch (event.type) {
        case "message_start":
          model = event.message?.model ?? model;
          inputTokens = event.message?.usage?.input_tokens ?? inputTokens;
          break;
        case "content_block_delta":
          if (event.delta?.type === "text_delta" && event.delta.text) {
            text += event.delta.text;
            onDelta(event.delta.text);
          }
          break;
        case "message_delta":
          outputTokens = event.usage?.output_tokens ?? outputTokens;
          if (event.delta?.stop_reason === "refusal") refused = true;
          break;
        case "error":
          throw new AiError(
            "overloaded",
            `anthropic: ${event.error?.message ?? "stream error"}`,
            { provider: "anthropic" },
          );
      }
    });

    if (refused && text.length === 0) {
      throw new AiError("content", "anthropic: the model declined this request.", {
        provider: "anthropic",
      });
    }

    return {
      text,
      usage: { inputTokens, outputTokens },
      model,
      provider: "anthropic",
      cached: false,
    } satisfies AiResponse;
  },

  async listModels(settings, fetchImpl, signal) {
    const response = await safeFetch("anthropic", fetchImpl, MODELS_URL, {
      method: "GET",
      headers: headers(settings.apiKey),
      signal,
    });
    const data = (await response.json()) as {
      data?: { id?: string; display_name?: string }[];
    };
    return (data.data ?? [])
      .filter((model): model is { id: string; display_name?: string } =>
        typeof model.id === "string",
      )
      .map<AiModelListItem>((model) => ({
        id: model.id,
        label: model.display_name ?? model.id,
      }));
  },
};
