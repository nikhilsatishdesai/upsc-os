import {
  AiError,
  type AiModelListItem,
  type AiProviderAdapter,
  type AiRequest,
  type AiResponse,
} from "../types";
import { parseJson, readSseStream, safeFetch } from "./http";

/**
 * Google Gemini generateContent adapter (raw fetch). Vendor quirks
 * absorbed here: role name "model" instead of "assistant"; system prompt
 * as `system_instruction`; JSON mode via `responseMimeType`; safety
 * blocks surfaced as typed "content" errors; the API key travels in a
 * header (never the URL, which would leak into logs).
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS_URL = `${API_BASE}?pageSize=1000`;

function url(model: string, stream: boolean): string {
  return stream
    ? `${API_BASE}/${model}:streamGenerateContent?alt=sse`
    : `${API_BASE}/${model}:generateContent`;
}

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-goog-api-key": apiKey,
  };
}

function buildBody(request: AiRequest) {
  return {
    system_instruction: { parts: [{ text: request.system }] },
    contents: request.messages.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    generationConfig: {
      maxOutputTokens: request.maxTokens,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

type GeminiChunk = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  modelVersion?: string;
};

function chunkText(chunk: GeminiChunk): string {
  return (chunk.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");
}

function assertNotBlocked(chunk: GeminiChunk): void {
  const blocked =
    chunk.promptFeedback?.blockReason ||
    chunk.candidates?.[0]?.finishReason === "SAFETY";
  if (blocked) {
    throw new AiError("content", "gemini: the model declined this request.", {
      provider: "gemini",
    });
  }
}

export const geminiAdapter: AiProviderAdapter = {
  id: "gemini",

  async complete(settings, request, fetchImpl, signal) {
    const response = await safeFetch(
      "gemini",
      fetchImpl,
      url(settings.model, false),
      {
        method: "POST",
        headers: headers(settings.apiKey),
        body: JSON.stringify(buildBody(request)),
        signal,
      },
    );
    const data = (await response.json()) as GeminiChunk;
    assertNotBlocked(data);
    return {
      text: chunkText(data),
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model: data.modelVersion ?? settings.model,
      provider: "gemini",
      cached: false,
    } satisfies AiResponse;
  },

  async stream(settings, request, onDelta, fetchImpl, signal) {
    const response = await safeFetch(
      "gemini",
      fetchImpl,
      url(settings.model, true),
      {
        method: "POST",
        headers: headers(settings.apiKey),
        body: JSON.stringify(buildBody(request)),
        signal,
      },
    );

    let text = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let model = settings.model;

    await readSseStream("gemini", response, (payload) => {
      const chunk = parseJson(payload) as GeminiChunk | null;
      if (!chunk) return;
      assertNotBlocked(chunk);
      model = chunk.modelVersion ?? model;
      const delta = chunkText(chunk);
      if (delta) {
        text += delta;
        onDelta(delta);
      }
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
        outputTokens =
          chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
      }
    });

    return {
      text,
      usage: { inputTokens, outputTokens },
      model,
      provider: "gemini",
      cached: false,
    } satisfies AiResponse;
  },

  async listModels(settings, fetchImpl, signal) {
    const response = await safeFetch("gemini", fetchImpl, MODELS_URL, {
      method: "GET",
      headers: headers(settings.apiKey),
      signal,
    });
    const data = (await response.json()) as {
      models?: {
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }[];
    };
    return (data.models ?? [])
      .filter(
        (model): model is {
          name: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        } =>
          typeof model.name === "string" &&
          // Only chat-capable models — the API also lists embedding/vision-
          // only endpoints that generateContent would reject.
          (model.supportedGenerationMethods ?? []).includes("generateContent"),
      )
      .map<AiModelListItem>((model) => {
        // Gemini ids come prefixed as "models/gemini-…"; send the bare id.
        const id = model.name.replace(/^models\//, "");
        return { id, label: model.displayName ?? id };
      });
  },
};
