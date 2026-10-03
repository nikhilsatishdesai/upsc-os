import { AI_CONFIG } from "../config";
import type { ContextBundle } from "../context";
import { composeSystem, type BuiltPrompt } from "./types";
import { CHANAKYA_PERSONA } from "./persona";

/**
 * Mains answer evaluation — the examiner's-eye review of a timed practice
 * answer (PSIR optional or GS). Grounded in the student's own notes for
 * the topic so feedback can point at material they already have.
 */

export const ANSWER_EVALUATION_VERSION = "answer-evaluation@1";

export function buildAnswerEvaluationPrompt(input: {
  question: string;
  marks: number;
  wordTarget: number;
  timeLimitMinutes: number;
  minutesSpent: number;
  answerText: string;
  /** "PSIR Paper I · Political theory…" or a GS paper label. */
  paperLabel: string;
  /** Thinkers worth citing for this topic (names only). */
  suggestedThinkers: string[];
  context: ContextBundle | null;
}): BuiltPrompt {
  const wordCount = input.answerText.trim() === ""
    ? 0
    : input.answerText.trim().split(/\s+/).length;
  const thinkers =
    input.suggestedThinkers.length > 0
      ? `\nThinkers/schools typically rewarded on this topic: ${input.suggestedThinkers.join(", ")}.`
      : "";

  return {
    version: ANSWER_EVALUATION_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        input.context,
        `Act as a strict but constructive UPSC Mains examiner for ${input.paperLabel}.
Evaluate the student's answer to a ${input.marks}-mark question (target ≈ ${input.wordTarget} words in ${input.timeLimitMinutes} minutes; they wrote ${wordCount} words in ${input.minutesSpent} minutes).${thinkers}

Respond in markdown with exactly these sections:
1. **Score: X / ${input.marks}** — realistic UPSC marking (good optional answers typically earn 45–60% of the marks; never inflate). One line on why.
2. **Demand check** — did it answer every part of the question and its directive word?
3. **What worked** — 2–3 specific bullets.
4. **Gaps** — the most important missing elements across: introduction, thinkers & theory, competing perspectives, examples/evidence, structure, conclusion, word/time discipline.
5. **Add these** — 2–4 concrete thinkers, concepts, judgments, data or current events to include, each with one line on where it fits.
6. **Better opening & closing** — a rewritten introduction and conclusion, each under 40 words.
7. **Model skeleton** — a bullet outline of a topper-grade answer.

If the student's notes (above) contain relevant material they did not use, say so explicitly. Keep the whole review under 450 words.`,
      ),
      messages: [
        {
          role: "user",
          content: `Question (${input.marks} marks): ${input.question}\n\nMy answer:\n${input.answerText.trim() === "" ? "(blank)" : input.answerText}`,
        },
      ],
      maxTokens: AI_CONFIG.outputTokens.generation,
      temperature: 0.3,
    },
  };
}
