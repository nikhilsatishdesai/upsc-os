import { AI_CONFIG } from "../config";
import type { ContextBundle } from "../context";
import { composeSystem, type BuiltPrompt } from "./types";
import { CHANAKYA_GENERATOR, CHANAKYA_PERSONA } from "./persona";

/**
 * Analysis prompt builders: analytics explanations, current-affairs
 * relevance, PYQ analysis — plus the essay/interview extension points
 * (architected now, surfaced in a later phase).
 */

export const ANALYTICS_EXPLANATION_VERSION = "analytics-explanation@1";

export type AnalyticsSubject = "burnout" | "forecast" | "readiness";

const ANALYTICS_QUESTION: Record<AnalyticsSubject, string> = {
  burnout:
    "Explain my burnout indicator: what is driving the number, how the planner is already reacting, and what I should change (if anything).",
  forecast:
    "Explain my completion forecast: how the expected date and probabilities are computed from my pace, and what would move them most.",
  readiness:
    "Explain my study health / readiness score: which components pull it down, which protect it, and the single highest-leverage improvement.",
};

export function buildAnalyticsExplanationPrompt(input: {
  subject: AnalyticsSubject;
  context: ContextBundle;
}): BuiltPrompt {
  return {
    version: ANALYTICS_EXPLANATION_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        input.context,
        `Interpret the analytics above for the student. Use the actual numbers;
name the formula's ingredients in plain words (the engines are documented
and deterministic — you are the translator, not the calculator). End with
one concrete next step. Markdown, under 250 words.`,
      ),
      messages: [
        { role: "user", content: ANALYTICS_QUESTION[input.subject] },
      ],
      maxTokens: AI_CONFIG.outputTokens.reasoning,
      temperature: 0.4,
    },
  };
}

export const CURRENT_AFFAIRS_VERSION = "current-affairs@1";

export function buildCurrentAffairsPrompt(input: {
  title: string;
  date: string;
  source: string;
  summary: string;
  linkedTopicTitles: string[];
}): BuiltPrompt {
  return {
    version: CURRENT_AFFAIRS_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        null,
        `Analyse a current-affairs item for UPSC relevance. Output markdown:
1. **Why it matters** — the exam angle in 2–3 lines;
2. **Prelims pointers** — factual hooks worth memorizing;
3. **Mains usage** — where it fits as an example/argument (name GS paper);
4. **Linkages** — connected static topics.
Under 250 words. No invented facts beyond the item given.`,
      ),
      messages: [
        {
          role: "user",
          content: `Item: ${input.title}\nDate: ${input.date}${input.source ? `\nSource: ${input.source}` : ""}${input.summary ? `\nSummary: ${input.summary}` : ""}\nAlready linked syllabus topics: ${input.linkedTopicTitles.join(", ") || "none"}`,
        },
      ],
      maxTokens: AI_CONFIG.outputTokens.reasoning,
      temperature: 0.4,
    },
  };
}

export const PYQ_ANALYSIS_VERSION = "pyq-analysis@1";

export function buildPyqAnalysisPrompt(input: {
  question: string;
  year: number;
  paper: string;
  marks: number | null;
  context: ContextBundle;
}): BuiltPrompt {
  return {
    version: PYQ_ANALYSIS_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_GENERATOR,
        input.context,
        `Analyse this previous-year question against the student's material above. Output markdown:
1. **What it tests** — the concept and the trap, if any;
2. **Approach** — how to crack it (Prelims elimination or Mains structure);
3. **Model answer sketch** — brief (points for Mains, the answer + why for Prelims);
4. **Preparedness** — can the student answer it from their notes above? What's missing?
Under 300 words.`,
      ),
      messages: [
        {
          role: "user",
          content: `[${input.year} ${input.paper}${input.marks ? `, ${input.marks} marks` : ""}] ${input.question}`,
        },
      ],
      maxTokens: AI_CONFIG.outputTokens.reasoning,
      temperature: 0.4,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Future-expansion builders (architecture in place; UI arrives with   */
/* the essay/interview phases). Fully functional and unit-tested so    */
/* wiring them up later is purely a UI task.                           */
/* ------------------------------------------------------------------ */

export const ESSAY_FEEDBACK_VERSION = "essay-feedback@1";

export function buildEssayFeedbackPrompt(input: {
  theme: string;
  essayText: string;
}): BuiltPrompt {
  return {
    version: ESSAY_FEEDBACK_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        null,
        `Evaluate a UPSC Essay-paper draft on “${input.theme}” against the UPSC rubric: structure & flow, thesis clarity, breadth of dimensions, examples & evidence, language, conclusion. Give a band (out of 125), per-dimension feedback, and the three highest-impact improvements. Markdown.`,
      ),
      messages: [{ role: "user", content: input.essayText }],
      maxTokens: AI_CONFIG.outputTokens.generation,
      temperature: 0.4,
    },
  };
}

export const INTERVIEW_PRACTICE_VERSION = "interview-practice@1";

export function buildInterviewPracticePrompt(input: {
  profileNotes: string;
  window: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}): BuiltPrompt {
  return {
    version: INTERVIEW_PRACTICE_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        null,
        `Conduct a UPSC Personality Test mock interview (text). You are the board chair: courteous, probing, unhurried. Ask ONE question at a time, follow up on weak or evasive answers, mix DAF-style personal questions with opinion and situational ones. After ~8 exchanges, close with a short board-style assessment.
${input.profileNotes.trim() !== "" ? `\nCandidate profile notes:\n${input.profileNotes}` : ""}`,
      ),
      messages: [
        ...input.window,
        { role: "user", content: input.userMessage },
      ],
      maxTokens: AI_CONFIG.outputTokens.chat,
      temperature: 0.7,
    },
  };
}
