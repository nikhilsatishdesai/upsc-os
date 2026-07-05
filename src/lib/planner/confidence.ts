import type { TopicState } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { diffDays } from "./dates";
import { resolveTopicIntel } from "./intel";

export type EffectiveConfidence = {
  /** 1–5 (fractional). The user's base rating adjusted by behaviour. */
  value: number;
  /** Human-readable adjustments, for explanations ("Why this session?"). */
  reasons: string[];
};

/**
 * Confidence decay model.
 *
 * The stored `confidence` is the user's own 1–5 rating and is never mutated
 * by the engine. The *effective* confidence the planner acts on evolves:
 *   + completed revisions build it up;
 *   − time since the last study/revision erodes it;
 *   − repeated postponement erodes it;
 *   − hard topics carry a standing handicap.
 * Everything is derived, so it back-tests cleanly and needs no migrations.
 */
export function effectiveConfidence(
  topicId: string,
  state: TopicState,
  today: string,
): EffectiveConfidence {
  const cfg = PLANNER_CONFIG.confidenceModel;
  const reasons: string[] = [];
  let value: number = state.confidence;

  const revisionBoost = Math.min(
    cfg.revisionBoostCap,
    state.revisionCount * cfg.revisionBoost,
  );
  if (revisionBoost > 0) {
    value += revisionBoost;
    reasons.push(
      `+${revisionBoost.toFixed(1)} from ${state.revisionCount} completed revision${
        state.revisionCount === 1 ? "" : "s"
      }`,
    );
  }

  if (state.lastStudiedAt) {
    const idleDays = Math.max(0, diffDays(state.lastStudiedAt, today));
    const decay = Math.min(cfg.decayCap, (idleDays / 30) * cfg.decayPer30Days);
    if (decay >= 0.1) {
      value -= decay;
      reasons.push(`−${decay.toFixed(1)} after ${idleDays} days without revision`);
    }
  }

  if (state.postponeCount > 0) {
    const penalty = Math.min(
      cfg.postponePenaltyCap,
      state.postponeCount * cfg.postponePenalty,
    );
    value -= penalty;
    reasons.push(
      `−${penalty.toFixed(1)} after being postponed ${state.postponeCount}×`,
    );
  }

  if (resolveTopicIntel(topicId, state).difficulty === "hard") {
    value -= cfg.hardPenalty;
    reasons.push(`−${cfg.hardPenalty.toFixed(1)} for hard material`);
  }

  return { value: Math.min(5, Math.max(1, value)), reasons };
}
