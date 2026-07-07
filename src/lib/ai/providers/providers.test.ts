import { describe, expect, it, vi } from "vitest";

import { anthropicAdapter } from "./anthropic";
import { openAiAdapter } from "./openai";
import { geminiAdapter } from "./gemini";
import { readSseStream } from "./http";
import type { AiRequest } from "../types";

const request: AiRequest = {
  system: "You are a mentor.",
  messages: [
    { role: "user", content: "Hi" },
    { role: "assistant", content: "Hello" },
    { role: "user", content: "Explain FR" },
  ],
  maxTokens: 200,
  temperature: 0.5,
  json: true,
};

/** A Response whose body streams the given SSE text chunks. */
function sseResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

/** The [url, init] of a mock fetch call (the no-arg mock infers `[]`). */
function callOf(
  mock: { mock: { calls: unknown[] } },
  index = 0,
): [string, RequestInit] {
  return mock.mock.calls[index] as unknown as [string, RequestInit];
}

describe("Anthropic adapter", () => {
  it("puts system top-level, omits temperature, sets the browser header, parses usage", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [{ type: "text", text: "Answer" }],
            usage: { input_tokens: 11, output_tokens: 22 },
            model: "claude-opus-4-8",
          }),
          { status: 200 },
        ),
    );
    const response = await anthropicAdapter.complete(
      { apiKey: "key", model: "claude-opus-4-8" },
      request,
      fetchMock as unknown as typeof fetch,
    );
    const init = callOf(fetchMock)[1];
    const body = JSON.parse(init.body as string);
    expect(body.system).toContain("You are a mentor.");
    expect(body.system).toContain("JSON"); // json instruction appended
    expect(body.temperature).toBeUndefined(); // sampling params not sent
    expect((init.headers as Record<string, string>)["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(response.text).toBe("Answer");
    expect(response.usage).toEqual({ inputTokens: 11, outputTokens: 22 });
  });

  it("maps a refusal stop reason to a content error", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ content: [], stop_reason: "refusal" }),
          { status: 200 },
        ),
    );
    await expect(
      anthropicAdapter.complete(
        { apiKey: "k", model: "m" },
        request,
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "content" });
  });

  it("maps a 401 to an auth error", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 401 }));
    await expect(
      anthropicAdapter.complete(
        { apiKey: "bad", model: "m" },
        request,
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "auth" });
  });
});

describe("OpenAI adapter", () => {
  it("sends system as the first message and requests json_object", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "{}" } }],
            usage: { prompt_tokens: 3, completion_tokens: 4 },
            model: "gpt-4.1-mini",
          }),
          { status: 200 },
        ),
    );
    await openAiAdapter.complete(
      { apiKey: "k", model: "gpt-4.1-mini" },
      request,
      fetchMock as unknown as typeof fetch,
    );
    const body = JSON.parse(callOf(fetchMock)[1].body as string);
    expect(body.messages[0]).toEqual({ role: "system", content: "You are a mentor." });
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.temperature).toBe(0.5);
  });
});

describe("Gemini adapter", () => {
  it("maps assistant→model, uses system_instruction and the key header", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Reply" }] } }],
            usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 9 },
            modelVersion: "gemini-2.5-flash",
          }),
          { status: 200 },
        ),
    );
    const response = await geminiAdapter.complete(
      { apiKey: "k", model: "gemini-2.5-flash" },
      request,
      fetchMock as unknown as typeof fetch,
    );
    const [url, init] = callOf(fetchMock);
    const body = JSON.parse(init.body as string);
    expect(url).not.toContain("k"); // key not in URL
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
    expect(body.system_instruction.parts[0].text).toBe("You are a mentor.");
    expect(body.contents[1].role).toBe("model"); // assistant mapped
    expect(response.text).toBe("Reply");
  });

  it("maps a safety block to a content error", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }),
          { status: 200 },
        ),
    );
    await expect(
      geminiAdapter.complete(
        { apiKey: "k", model: "m" },
        request,
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "content" });
  });
});

describe("SSE parsing", () => {
  it("reassembles data payloads across chunk boundaries", async () => {
    const payloads: string[] = [];
    const response = sseResponse([
      "data: {\"a\":1}\n\n",
      "data: {\"b\"",
      ":2}\n\ndata: [DONE]\n\n",
    ]);
    await readSseStream("openai", response, (payload) => payloads.push(payload));
    expect(payloads).toEqual(['{"a":1}', '{"b":2}', "[DONE]"]);
  });
});

describe("OpenAI streaming", () => {
  it("accumulates content deltas and final usage", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"He"}}],"model":"gpt-4.1-mini"}\n\n',
        'data: {"choices":[{"delta":{"content":"llo"}}]}\n\n',
        'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":2,"completion_tokens":3}}\n\n',
        "data: [DONE]\n\n",
      ]),
    );
    const deltas: string[] = [];
    const response = await openAiAdapter.stream(
      { apiKey: "k", model: "gpt-4.1-mini" },
      request,
      (delta) => deltas.push(delta),
      fetchMock as unknown as typeof fetch,
    );
    expect(deltas.join("")).toBe("Hello");
    expect(response.text).toBe("Hello");
    expect(response.usage).toEqual({ inputTokens: 2, outputTokens: 3 });
  });
});

describe("listModels — provider-agnostic model discovery", () => {
  it("Anthropic maps id + display_name", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: "claude-sonnet-5", display_name: "Claude Sonnet 5" },
            { id: "claude-future-9" }, // no display_name → id as label
            { display_name: "no id" }, // dropped
          ],
        }),
        { status: 200 },
      ),
    );
    const models = await anthropicAdapter.listModels!(
      { apiKey: "k" },
      fetchMock as unknown as typeof fetch,
    );
    const [url, init] = callOf(fetchMock);
    expect(url).toContain("/v1/models");
    expect(init.method).toBe("GET");
    expect(models).toEqual([
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude-future-9", label: "claude-future-9" },
    ]);
  });

  it("OpenAI returns every id verbatim (no whitelist)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ data: [{ id: "gpt-6" }, { id: "gpt-9-ultra" }] }),
        { status: 200 },
      ),
    );
    const models = await openAiAdapter.listModels!(
      { apiKey: "k" },
      fetchMock as unknown as typeof fetch,
    );
    expect(models.map((m) => m.id)).toEqual(["gpt-6", "gpt-9-ultra"]);
  });

  it("Gemini strips the models/ prefix and filters to chat models", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          models: [
            {
              name: "models/gemini-4-pro",
              displayName: "Gemini 4 Pro",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/embedding-1",
              supportedGenerationMethods: ["embedContent"], // dropped
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const models = await geminiAdapter.listModels!(
      { apiKey: "k" },
      fetchMock as unknown as typeof fetch,
    );
    expect(models).toEqual([{ id: "gemini-4-pro", label: "Gemini 4 Pro" }]);
  });

  it("surfaces auth failures as typed errors (UI falls back to manual)", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 401 }));
    await expect(
      anthropicAdapter.listModels!(
        { apiKey: "bad" },
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "auth" });
  });
});
