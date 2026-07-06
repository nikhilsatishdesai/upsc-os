import { AI_CONFIG } from "../config";
import { ACTION_PROTOCOL } from "../actions";
import type { ContextBundle } from "../context";
import { composeSystem, type BuiltPrompt } from "./types";
import { CHANAKYA_PERSONA } from "./persona";

/**
 * Planner-side prompt builders. The LLM advises and proposes actions;
 * the DETERMINISTIC engine validates and executes — the model never
 * writes tasks directly (docs/PHASE_C_SPEC.md §5 rule).
 */

export const PLANNER_ADVICE_VERSION = "planner-advice@1";

/** Preset planner intents surfaced as one-click "Ask Chanakya" entries. */
export const PLANNER_INTENTS = {
  "rebuild-schedule":
    "My plan feels stale. Should I rebuild the schedule? If yes, propose the rebuild-plan action.",
  "reduce-workload":
    "The current workload feels too heavy. How should I reduce it sustainably? Propose concrete setting changes (daily hours, weekend strategy) as actions.",
  "vacation-mode":
    "I need a break soon. Help me plan a vacation period so the planner schedules around it, and propose the set-vacation action once you know the dates (ask me for dates if I haven't given them).",
  "recover-missed-week":
    "I missed most of last week. What is the smartest way to recover without burning out? Use my missed sessions and backlog from the data.",
  "explain-plan":
    "Explain my current plan: why these topics now, how revisions are placed, and whether the pace fits my exam dates.",
} as const;

export type PlannerIntent = keyof typeof PLANNER_INTENTS;

export function buildPlannerAdvicePrompt(input: {
  context: ContextBundle;
  question: string;
}): BuiltPrompt {
  return {
    version: PLANNER_ADVICE_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        input.context,
        [
          `Advise on the study plan. You may propose changes, but remember:
the deterministic planner engine executes them — you never schedule tasks
yourself. Anchor every suggestion in the forecast, burnout and backlog
numbers above, and say what each change trades away.`,
          ACTION_PROTOCOL,
        ].join("\n\n"),
      ),
      messages: [{ role: "user", content: input.question }],
      maxTokens: AI_CONFIG.outputTokens.reasoning,
      temperature: 0.5,
    },
  };
}

export const REVISION_COACH_VERSION = "revision-coach@1";

/** Active-recall coaching for a due revision session. */
export function buildRevisionCoachPrompt(input: {
  topicTitle: string;
  revisionRound: number;
  context: ContextBundle;
  window: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}): BuiltPrompt {
  return {
    version: REVISION_COACH_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        input.context,
        `Run a short active-recall revision of “${input.topicTitle}” (spaced revision round ${input.revisionRound}).
Method: ask ONE focused question at a time from the student's material
above; wait for their answer; give brief corrective feedback; then the
next question. Escalate difficulty gradually. After about 5 questions,
close with an honest read on their recall and, if it clearly differs from
their stored confidence, suggest the set-confidence action.

${ACTION_PROTOCOL}`,
      ),
      messages: [
        ...input.window,
        { role: "user", content: input.userMessage },
      ],
      maxTokens: AI_CONFIG.outputTokens.chat,
      temperature: 0.6,
    },
  };
}
