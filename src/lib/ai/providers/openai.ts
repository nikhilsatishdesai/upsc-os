import type { AiProviderAdapter, AiRequest, AiResponse } from "../types";
import { parseJson, readSseStream, safeFetch } from "./http";

/**
 * OpenAI Chat Completions adapter (raw fetch). Vendor quirks absorbed
 * here: system prompt travels as the first message; JSON mode uses
 * `response_format` (the word "JSON" must appear in the prompt — the
 * prompt builders guarantee that); streamed usage needs `stream_options`.
 */

const API_URL = "https://api.openai.com/v1/chat/completions";

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };
}

function buildBody(model: string, request: AiRequest, stream: boolean) {
  return {
    model,
    max_tokens: request.maxTokens,
    ...(request.temperature !== undefined
      ? { temperature: request.temperature }
      : {}),
    ...(request.json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: request.system },
      ...request.messages.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    ],
    ...(stream
      ? { stream: true, stream_options: { include_usage: true } }
      : {}),
  };
}

type OpenAiUsage = { prompt_tokens?: number; completion_tokens?: number };

export const openAiAdapter: AiProviderAdapter = {
  id: "openai",

  async complete(settings, request, fetchImpl, signal) {
    const response = await safeFetch("openai", fetchImpl, API_URL, {
      method: "POST",
      headers: headers(settings.apiKey),
      body: JSON.stringify(buildBody(settings.model, request, false)),
      signal,
    });
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: OpenAiUsage;
      model?: string;
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
      model: data.model ?? settings.model,
      provider: "openai",
      cached: false,
    } satisfies AiResponse;
  },

  async stream(settings, request, onDelta, fetchImpl, signal) {
    const response = await safeFetch("openai", fetchImpl, API_URL, {
      method: "POST",
      headers: headers(settings.apiKey),
      body: JSON.stringify(buildBody(settings.model, request, true)),
      signal,
    });

    let text = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let model = settings.model;

    await readSseStream("openai", response, (payload) => {
      if (payload === "[DONE]") return;
      const chunk = parseJson(payload) as {
        choices?: { delta?: { content?: string } }[];
        usage?: OpenAiUsage | null;
        model?: string;
      } | null;
      if (!chunk) return;
      model = chunk.model ?? model;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        onDelta(delta);
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
        outputTokens = chunk.usage.completion_tokens ?? outputTokens;
      }
    });

    return {
      text,
      usage: { inputTokens, outputTokens },
      model,
      provider: "openai",
      cached: false,
    } satisfies AiResponse;
  },
};
