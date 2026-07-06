import type { ContextBundle } from "../context";
import { renderContext } from "../context";
import type { AiRequest } from "../types";

/**
 * Prompt-system contract. Every builder is a pure function returning a
 * versioned, ready-to-send request. Versions are recorded in cache keys,
 * so improving a prompt automatically invalidates stale cached output.
 * No component ever concatenates prompt strings.
 */

export type BuiltPrompt = {
  /** Bump when the wording changes meaningfully (cache invalidation). */
  version: string;
  request: AiRequest;
};

/** Compose a system prompt from persona + context + task instructions. */
export function composeSystem(
  persona: string,
  bundle: ContextBundle | null,
  instructions: string,
): string {
  const parts = [persona];
  if (bundle && bundle.sections.length > 0) {
    parts.push(
      `# The student's data (ground truth — use ONLY this, never invent)\n\n${renderContext(bundle)}`,
    );
  }
  parts.push(`# Your task\n\n${instructions}`);
  return parts.join("\n\n---\n\n");
}
