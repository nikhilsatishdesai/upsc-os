import { PSIR_SECTION_A_UNITS } from "@/data/psir/exam";
import { PSIR_QUESTIONS } from "@/data/psir/questions";
import { PSIR_SOURCES } from "@/data/psir/sources";
import { PSIR_SYNERGY } from "@/data/psir/synergy";
import { THINKERS } from "@/data/psir/thinkers";
import type {
  PracticeQuestion,
  PsirPaperId,
  StudySource,
  SynergyLink,
  Thinker,
} from "@/data/psir/types";
import {
  getAdjacentLeaves,
  getChildren,
  getLeafIds,
  getNode,
  type SyllabusNode,
} from "@/lib/syllabus";
import { getTopicState, type TopicStateMap } from "@/lib/stages";
import { resolveTopicIntel } from "@/lib/planner/intel";

/**
 * Read-only lookups over the PSIR reference library — pure functions, no
 * store access. UI components and the AI context use these so the
 * thinker/question/source/synergy joins live in one place.
 */

export const PSIR_PAPER_IDS: PsirPaperId[] = ["mains.psir1", "mains.psir2"];

export function isPsirId(id: string): boolean {
  return id === "mains.psir1" || id === "mains.psir2" ||
    id.startsWith("mains.psir1.") || id.startsWith("mains.psir2.");
}

export function psirPaperOf(id: string): PsirPaperId | null {
  if (id === "mains.psir1" || id.startsWith("mains.psir1.")) return "mains.psir1";
  if (id === "mains.psir2" || id.startsWith("mains.psir2.")) return "mains.psir2";
  return null;
}

/** The unit (depth-2 node) a PSIR id belongs to, e.g. mains.psir1.concepts. */
export function psirUnitOf(id: string): string | null {
  if (!isPsirId(id)) return null;
  const segments = id.split(".");
  return segments.length >= 3 ? segments.slice(0, 3).join(".") : null;
}

export function psirSectionOf(unitId: string): "A" | "B" {
  return PSIR_SECTION_A_UNITS.has(unitId) ? "A" : "B";
}

/** Units of a paper split into Section A and Section B, in syllabus order. */
export function psirSections(
  paperId: PsirPaperId,
): { label: "A" | "B"; units: SyllabusNode[] }[] {
  const units = getChildren(paperId);
  return (["A", "B"] as const).map((label) => ({
    label,
    units: units.filter((unit) => psirSectionOf(unit.id) === label),
  }));
}

function coversTopic(coverId: string, topicId: string): boolean {
  return topicId === coverId || topicId.startsWith(coverId + ".");
}

export function thinkersForTopic(topicId: string): Thinker[] {
  return THINKERS.filter((thinker) =>
    thinker.topicIds.some(
      (id) => id === topicId || coversTopic(topicId, id),
    ),
  );
}

export function questionsForTopic(topicId: string): PracticeQuestion[] {
  return PSIR_QUESTIONS.filter((question) =>
    coversTopic(topicId, question.topicId),
  );
}

export function sourcesForTopic(topicId: string): StudySource[] {
  return PSIR_SOURCES.filter((source) =>
    source.coversIds.some(
      (id) => coversTopic(id, topicId) || coversTopic(topicId, id),
    ),
  );
}

export function synergyForTopic(topicId: string): SynergyLink | null {
  const unit = psirUnitOf(topicId);
  if (!unit) return null;
  return PSIR_SYNERGY.find((link) => link.psirId === unit) ?? null;
}

export function getPracticeQuestion(id: string): PracticeQuestion | undefined {
  return PSIR_QUESTIONS.find((question) => question.id === id);
}

/** "PSIR-I · A3–7 · Justice, Equality…" style label for a topic. */
export function psirTopicLabel(topicId: string): string {
  const paper = psirPaperOf(topicId);
  const unit = psirUnitOf(topicId);
  const paperLabel = paper === "mains.psir1" ? "PSIR-I" : "PSIR-II";
  const unitTitle = unit ? getNode(unit)?.title : undefined;
  return unitTitle ? `${paperLabel} · ${unitTitle}` : paperLabel;
}

/**
 * What to study next in the optional: unfinished first readings first
 * (finish what you started), then by exam priority, then in syllabus
 * reading order. Excluded topics are skipped.
 */
export function nextPsirTopics(topics: TopicStateMap, count: number): string[] {
  const leaves = PSIR_PAPER_IDS.flatMap((paper) => getLeafIds(paper));
  const candidates = leaves
    .map((id) => ({ id, state: getTopicState(topics, id) }))
    .filter(
      ({ state }) =>
        state.planState !== "excluded" &&
        (state.stage === "not-started" || state.stage === "first-reading"),
    )
    .map(({ id, state }) => ({
      id,
      started: state.stage === "first-reading" ? 0 : 1,
      rank: resolveTopicIntel(id, state).priorityRank,
      order: getAdjacentLeaves(id).position + (id.startsWith("mains.psir2.") ? 1000 : 0),
    }));
  candidates.sort(
    (a, b) => a.started - b.started || a.rank - b.rank || a.order - b.order,
  );
  return candidates.slice(0, count).map((candidate) => candidate.id);
}
