import { AiError, type AiProviderId } from "../types";

/**
 * Shared HTTP/SSE plumbing for the provider adapters. Vendor quirks stay
 * inside each adapter; the generic transport lives here.
 */

/** Map an HTTP failure to a typed AiError. */
export function httpError(
  provider: AiProviderId,
  status: number,
  body: string,
  retryAfterHeader: string | null,
): AiError {
  const retryAfterMs = retryAfterHeader
    ? Math.max(0, Math.round(parseFloat(retryAfterHeader) * 1000)) || null
    : null;
  const detail = body.slice(0, 300);
  if (status === 401 || status === 403) {
    return new AiError("auth", `${provider}: API key rejected (${status}).`, {
      provider,
      status,
    });
  }
  if (status === 429) {
    return new AiError("rate-limit", `${provider}: rate limited.`, {
      provider,
      status,
      retryAfterMs,
    });
  }
  if (status === 529 || status >= 500) {
    return new AiError("overloaded", `${provider}: service overloaded (${status}).`, {
      provider,
      status,
      retryAfterMs,
    });
  }
  return new AiError(
    "bad-request",
    `${provider}: request rejected (${status}). ${detail}`,
    { provider, status },
  );
}

/** Wrap fetch so network/abort failures become typed AiErrors. */
export async function safeFetch(
  provider: AiProviderId,
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiError("aborted", "Request cancelled.", { provider });
    }
    throw new AiError(
      "network",
      `${provider}: network error (${error instanceof Error ? error.message : "fetch failed"}).`,
      { provider },
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw httpError(
      provider,
      response.status,
      body,
      response.headers.get("retry-after"),
    );
  }
  return response;
}

/**
 * Consume a Server-Sent-Events body, invoking `onData` for every complete
 * `data:` payload (multi-line data fields are joined per the SSE spec).
 * Works on any vendor's SSE stream — the adapter interprets the payloads.
 */
export async function readSseStream(
  provider: AiProviderId,
  response: Response,
  onData: (payload: string) => void,
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new AiError("network", `${provider}: empty streaming response.`, {
      provider,
    });
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];

  const flushEvent = () => {
    if (dataLines.length > 0) {
      onData(dataLines.join("\n"));
      dataLines = [];
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line === "") {
          flushEvent();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
        // event:/id:/retry:/comment lines are ignored — payloads carry type.
        newline = buffer.indexOf("\n");
      }
    }
    flushEvent();
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiError("aborted", "Stream cancelled.", { provider });
    }
    throw new AiError(
      "network",
      `${provider}: stream interrupted (${error instanceof Error ? error.message : "read failed"}).`,
      { provider },
    );
  } finally {
    reader.releaseLock();
  }
}

/** Parse a JSON payload defensively (SSE payloads, response bodies). */
export function parseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
