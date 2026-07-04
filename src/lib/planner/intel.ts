import {
  topicIntelOverrides,
  unitIntelDefaults,
  type IntelHint,
} from "@/data/topic-intel";
import { getNode } from "@/lib/syllabus";
import {
  priorityRank,
  type Difficulty,
  type Priority,
  type TopicState,
} from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";

/** Fully resolved intelligence for one topic — no nulls, ready to use. */
export type ResolvedTopicIntel = {
  priority: Priority;
  priorityRank: number;
  difficulty: Difficulty;
  /** Base first-reading minutes (before the difficulty multiplier). */
  estimatedMinutes: number;
  /** Share of the estimate one spaced-revision session takes (0–1). */
  revisionWeight: number;
};

export function paperIdOf(topicId: string): string {
  return topicId.split(".").slice(0, 2).join(".");
}

export function unitIdOf(topicId: string): string {
  const segments = topicId.split(".");
  return segments.slice(0, Math.min(3, segments.length)).join(".");
}

/** Human name of the topic's subject (its unit node). */
export function subjectNameOf(topicId: string): string {
  return getNode(unitIdOf(topicId))?.title ?? "";
}

const PAPER_SHORT_NAMES: Record<string, string> = {
  "prelims.gs": "Prelims GS",
  "prelims.csat": "CSAT",
  "mains.essay": "Essay",
  "mains.gs1": "GS-I",
  "mains.gs2": "GS-II",
  "mains.gs3": "GS-III",
  "mains.gs4": "GS-IV",
  "mains.languages": "Language",
};

export function paperShortName(topicId: string): string {
  return PAPER_SHORT_NAMES[paperIdOf(topicId)] ?? paperIdOf(topicId);
}

function curatedHint<K extends keyof IntelHint>(
  topicId: string,
  key: K,
): IntelHint[K] | undefined {
  const override = topicIntelOverrides[topicId]?.[key];
  if (override !== undefined) return override;
  // Walk ancestors from the most specific (sub-unit) up to the paper.
  const segments = topicId.split(".");
  for (let length = segments.length - 1; length >= 2; length--) {
    const hint = unitIntelDefaults[segments.slice(0, length).join(".")]?.[key];
    if (hint !== undefined) return hint;
  }
  return undefined;
}

/**
 * Resolve a topic's effective intelligence. Precedence per field:
 * user's own setting → curated topic override → curated unit default →
 * curated paper default → global config default.
 */
export function resolveTopicIntel(
  topicId: string,
  state?: TopicState | null,
): ResolvedTopicIntel {
  const priority =
    state?.priority ??
    curatedHint(topicId, "priority") ??
    PLANNER_CONFIG.defaultPriority;
  return {
    priority,
    priorityRank: priorityRank(priority),
    difficulty:
      state?.difficulty ??
      curatedHint(topicId, "difficulty") ??
      PLANNER_CONFIG.defaultDifficulty,
    estimatedMinutes:
      state?.estimatedMinutes ??
      curatedHint(topicId, "estimatedMinutes") ??
      PLANNER_CONFIG.defaultTopicMinutes,
    revisionWeight:
      curatedHint(topicId, "revisionWeight") ??
      PLANNER_CONFIG.defaultRevisionWeight,
  };
}

/** Curated-only view (ignores user overrides) — used for "Auto" labels. */
export function curatedTopicIntel(topicId: string): ResolvedTopicIntel {
  return resolveTopicIntel(topicId, null);
}
