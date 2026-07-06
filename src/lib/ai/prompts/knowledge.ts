import { AI_CONFIG } from "../config";
import type { ContextBundle } from "../context";
import { composeSystem, type BuiltPrompt } from "./types";
import { CHANAKYA_GENERATOR } from "./persona";

/**
 * Knowledge-workspace prompt builders: summary, explanation, mnemonics,
 * simplify, improve, flashcards, quiz. All work strictly from the topic
 * ContextBundle (the student's own material).
 */

export const TOPIC_SUMMARY_VERSION = "topic-summary@1";

export function buildTopicSummaryPrompt(input: {
  topicTitle: string;
  context: ContextBundle;
}): BuiltPrompt {
  return {
    version: TOPIC_SUMMARY_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Write an exam-oriented revision summary of “${input.topicTitle}” from the student's own material above.
- Markdown; start with a one-line essence, then compact sections/bullets.
- Prioritize what UPSC actually asks (use the PYQs above as signal).
- Include keywords, articles, cases, committees, dates found in the material.
- If the student's notes are thin, say so in one closing line and suggest what to add.
- Under 450 words.`,
      ),
      messages: [{ role: "user", content: "Generate the summary." }],
      maxTokens: AI_CONFIG.outputTokens.summary,
      temperature: 0.3,
    },
  };
}

export const TOPIC_EXPLANATION_VERSION = "topic-explanation@1";

export function buildExplainTopicPrompt(input: {
  topicTitle: string;
  context: ContextBundle;
  question?: string;
}): BuiltPrompt {
  return {
    version: TOPIC_EXPLANATION_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Explain “${input.topicTitle}” to the student as a great teacher would:
first principles, then the exam angle (Prelims facts vs Mains analysis),
common confusions, and how it links to neighbouring syllabus areas.
Markdown, under 500 words. Build on their notes above — do not repeat what
they clearly already know; deepen it.`,
      ),
      messages: [
        {
          role: "user",
          content: input.question?.trim()
            ? input.question
            : "Explain this topic to me.",
        },
      ],
      maxTokens: AI_CONFIG.outputTokens.summary,
      temperature: 0.4,
    },
  };
}

export const MNEMONICS_VERSION = "mnemonics@1";

export function buildMnemonicsPrompt(input: {
  topicTitle: string;
  context: ContextBundle;
}): BuiltPrompt {
  return {
    version: MNEMONICS_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Create 3–6 memory aids for the hardest-to-retain facts of “${input.topicTitle}” found in the material above (lists, sequences, dates, articles).
For each: the fact, then the mnemonic/hook, then one line on how it maps.
Markdown list. Prefer vivid, India-context hooks. No invented facts.`,
      ),
      messages: [{ role: "user", content: "Generate the mnemonics." }],
      maxTokens: AI_CONFIG.outputTokens.generation,
      temperature: 0.8,
    },
  };
}

export const SIMPLIFY_NOTES_VERSION = "simplify-notes@1";

export function buildSimplifyNotesPrompt(input: {
  topicTitle: string;
  noteMarkdown: string;
}): BuiltPrompt {
  return {
    version: SIMPLIFY_NOTES_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        null,
        `Rewrite the student's notes on “${input.topicTitle}” in simpler language without losing exam substance: shorter sentences, plain words, keep all facts/keywords/dates, keep markdown structure. Output ONLY the rewritten markdown.`,
      ),
      messages: [{ role: "user", content: input.noteMarkdown }],
      maxTokens: AI_CONFIG.outputTokens.generation,
      temperature: 0.3,
    },
  };
}

export const IMPROVE_NOTES_VERSION = "improve-notes@1";

export function buildImproveNotesPrompt(input: {
  topicTitle: string;
  context: ContextBundle;
}): BuiltPrompt {
  return {
    version: IMPROVE_NOTES_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Review the student's notes on “${input.topicTitle}” against what UPSC demands (use the PYQs above as signal). Produce a short improvement report in markdown:
1. **Gaps** — missing sub-themes, facts or angles (be specific);
2. **Structure** — how to reorganize for faster revision;
3. **Mains edge** — 2–3 analytical points/examples worth adding;
4. **Verdict** — one line: are these notes revision-ready?
Do NOT rewrite the notes; advise on them. Under 350 words.`,
      ),
      messages: [{ role: "user", content: "Review my notes." }],
      maxTokens: AI_CONFIG.outputTokens.reasoning,
      temperature: 0.4,
    },
  };
}

export const FLASHCARDS_VERSION = "flashcards@1";

/** JSON-mode flashcard drafting; the user reviews before anything saves. */
export function buildFlashcardsPrompt(input: {
  topicTitle: string;
  context: ContextBundle;
  count: number;
}): BuiltPrompt {
  return {
    version: FLASHCARDS_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Draft ${input.count} flashcards for “${input.topicTitle}” from the material above.
Rules: one atomic fact per card; front is a question, back is the shortest
complete answer; skip anything already covered by the existing flashcards
listed above (no duplicates); mix factual (Prelims) and conceptual (Mains).
Return JSON only: {"cards": [{"front": "...", "back": "..."}]}`,
      ),
      messages: [{ role: "user", content: "Generate the flashcards as JSON." }],
      maxTokens: AI_CONFIG.outputTokens.generation,
      temperature: 0.4,
      json: true,
    },
  };
}

export const QUIZ_VERSION = "quiz@1";

export type QuizDifficulty = "easy" | "medium" | "hard";

/** JSON-mode quiz generation (schema validated by the service). */
export function buildQuizPrompt(input: {
  topicTitle: string;
  context: ContextBundle;
  count: number;
  difficulty: QuizDifficulty;
}): BuiltPrompt {
  return {
    version: QUIZ_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Create a ${input.count}-question ${input.difficulty} MCQ quiz on “${input.topicTitle}” in UPSC Prelims style, from the material above.
Each question: 4 options, exactly one correct, plus a one-line explanation
of the correct answer. UPSC-style distractors (plausible, precise).
Return JSON only:
{"questions": [{"question": "...", "options": ["...","...","...","..."], "answerIndex": 0, "explanation": "..."}]}`,
      ),
      messages: [{ role: "user", content: "Generate the quiz as JSON." }],
      maxTokens: AI_CONFIG.outputTokens.generation,
      temperature: 0.4,
      json: true,
    },
  };
}
