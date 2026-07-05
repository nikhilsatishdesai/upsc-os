import { PRIORITY_META, type TopicState } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { effectiveConfidence } from "./confidence";
import { diffDays } from "./dates";
import { resolveTopicIntel } from "./intel";

export type PriorityScore = {
  /** Higher schedules earlier. Base range ~20–100, adjustments on top. */
  total: number;
  /** Human-readable contributions, for explanations. */
  reasons: string[];
};

export type PriorityContext = {
  today: string;
  /** Prelims date ("" when unset). */
  examDate: string;
};

/**
 * Dynamic priority engine. A topic's score continuously evolves:
 *   • curated exam importance is the base;
 *   • low effective confidence raises it (weak topics resurface);
 *   • overdue revisions raise it sharply;
 *   • repeated postponement raises it (avoided topics stop hiding);
 *   • exam proximity amplifies important topics;
 *   • completed revisions lower confidence-gap pressure naturally.
 * Pure and deterministic — the same inputs always score the same.
 */
export function priorityScore(
  topicId: string,
  state: TopicState,
  ctx: PriorityContext,
): PriorityScore {
  const cfg = PLANNER_CONFIG.priorityScore;
  const intel = resolveTopicIntel(topicId, state);
  const reasons: string[] = [];

  let total: number = cfg.base[intel.priority];
  reasons.push(
    `${PRIORITY_META[intel.priority].label} exam importance (+${cfg.base[intel.priority]})`,
  );

  const confidence = effectiveConfidence(topicId, state, ctx.today);
  const gap = Math.max(0, 5 - confidence.value);
  if (gap > 0.2) {
    const points = Math.round(gap * cfg.confidenceGapWeight);
    total += points;
    reasons.push(
      `Effective confidence ${confidence.value.toFixed(1)}/5 (+${points})`,
    );
  }

  if (state.nextRevisionAt && state.nextRevisionAt <= ctx.today) {
    const overdue = diffDays(state.nextRevisionAt, ctx.today);
    const points = Math.min(
      cfg.revisionOverdueCap,
      (overdue + 1) * cfg.revisionOverduePerDay,
    );
    total += points;
    reasons.push(
      overdue > 0
        ? `Revision overdue by ${overdue} day${overdue === 1 ? "" : "s"} (+${points})`
        : `Revision due today (+${points})`,
    );
  }

  if (state.postponeCount > 0) {
    const points = Math.min(
      cfg.postponeCap,
      state.postponeCount * cfg.postponeWeight,
    );
    total += points;
    reasons.push(`Postponed ${state.postponeCount}× (+${points})`);
  }

  if (ctx.examDate) {
    const daysLeft = diffDays(ctx.today, ctx.examDate);
    if (daysLeft >= 0 && daysLeft < cfg.proximityFromDays) {
      const closeness = 1 - daysLeft / cfg.proximityFromDays;
      const points = Math.round(
        cfg.base[intel.priority] * cfg.examProximityFactor * closeness,
      );
      if (points > 0) {
        total += points;
        reasons.push(`Prelims ${daysLeft} days away (+${points})`);
      }
    }
  }

  return { total, reasons };
}
