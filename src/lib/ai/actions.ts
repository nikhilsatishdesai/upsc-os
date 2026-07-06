import { getNode, isLeaf } from "@/lib/syllabus";
import {
  isPlanState,
  isPriority,
  type Confidence,
  type PlanState,
  type Priority,
} from "@/lib/stages";
import { isValidDateStr } from "@/lib/planner/dates";
import type { PlannerSettings, TaskSlot } from "@/lib/planner/types";
import { QUICK_NOTE_KINDS, type QuickNoteKind } from "@/lib/knowledge/types";

/**
 * The AI Action Layer. The AI never mutates state directly — it PROPOSES
 * typed actions; the user confirms; execution goes through the existing
 * store actions (so every business rule, counter and replan trigger keeps
 * working exactly as it does for manual edits). Parsing and validation
 * are strict: anything malformed is dropped with a reason, never guessed.
 */

export type AiAction =
  | { kind: "rebuild-plan" }
  | { kind: "plan-topic"; topicId: string; when: "today" | "tomorrow" | "this-week" }
  | { kind: "move-task"; taskId: string; date: string; slot?: TaskSlot }
  | { kind: "set-priority"; topicId: string; priority: Priority | null }
  | { kind: "set-confidence"; topicId: string; confidence: Confidence }
  | { kind: "set-plan-state"; topicId: string; planState: PlanState }
  | { kind: "add-flashcard"; topicId: string; front: string; back: string }
  | { kind: "add-quick-note"; topicId: string; text: string; noteKind: QuickNoteKind }
  | { kind: "bookmark-topic"; topicId: string; collectionId: string }
  | { kind: "set-vacation"; from: string | null; to: string | null }
  | { kind: "set-weekend-strategy"; strategy: PlannerSettings["weekendStrategy"] }
  | { kind: "set-daily-hours"; hours: number };

export type AiActionKind = AiAction["kind"];

/** What the mentor prompt teaches the model about acting. Kept beside the
 * validator so protocol and parser can never drift apart. */
export const ACTION_PROTOCOL = `
When (and only when) the student asks you to change something — or accepts a
change you suggested — append ONE fenced json block at the END of your reply:

\`\`\`json
{"actions": [{"kind": "..."}]}
\`\`\`

Allowed actions (use exact field names; topicId must be a real syllabus leaf id
from the context):
- {"kind": "rebuild-plan"} — regenerate the whole schedule
- {"kind": "plan-topic", "topicId": "...", "when": "today"|"tomorrow"|"this-week"}
- {"kind": "set-priority", "topicId": "...", "priority": "critical"|"high"|"medium"|"low"|null}
- {"kind": "set-confidence", "topicId": "...", "confidence": 1-5}
- {"kind": "set-plan-state", "topicId": "...", "planState": "included"|"paused"|"excluded"}
- {"kind": "add-flashcard", "topicId": "...", "front": "...", "back": "..."}
- {"kind": "add-quick-note", "topicId": "...", "text": "...", "noteKind": "reminder"|"mnemonic"|"trick"|"hook"|"definition"|"formula"}
- {"kind": "bookmark-topic", "topicId": "...", "collectionId": "col-must-revise"|"col-weak-areas"|"col-essay-material"|"col-interview-notes"}
- {"kind": "set-vacation", "from": "YYYY-MM-DD"|null, "to": "YYYY-MM-DD"|null}
- {"kind": "set-weekend-strategy", "strategy": "normal"|"light"|"revision-heavy"}
- {"kind": "set-daily-hours", "hours": 0.5-16}

The student confirms every action before it runs, so propose only what was
discussed. Never invent topic ids. Outside that block, write normally.
`.trim();

function isLeafTopicId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const node = getNode(value);
  return !!node && isLeaf(node);
}

const QUICK_KINDS = QUICK_NOTE_KINDS.map((kind) => kind.value);
const SLOTS: TaskSlot[] = ["morning", "afternoon", "evening"];
const BUILTIN_COLLECTION_IDS = [
  "col-must-revise",
  "col-weak-areas",
  "col-essay-material",
  "col-interview-notes",
];

/** Validate one raw object into a typed action (null = invalid). */
export function validateAiAction(raw: unknown): AiAction | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as Record<string, unknown>;
  switch (a.kind) {
    case "rebuild-plan":
      return { kind: "rebuild-plan" };
    case "plan-topic":
      return isLeafTopicId(a.topicId) &&
        (a.when === "today" || a.when === "tomorrow" || a.when === "this-week")
        ? { kind: "plan-topic", topicId: a.topicId, when: a.when }
        : null;
    case "move-task":
      return typeof a.taskId === "string" &&
        a.taskId !== "" &&
        isValidDateStr(a.date)
        ? {
            kind: "move-task",
            taskId: a.taskId,
            date: a.date,
            ...(SLOTS.includes(a.slot as TaskSlot)
              ? { slot: a.slot as TaskSlot }
              : {}),
          }
        : null;
    case "set-priority":
      return isLeafTopicId(a.topicId) &&
        (a.priority === null || isPriority(a.priority))
        ? { kind: "set-priority", topicId: a.topicId, priority: a.priority as Priority | null }
        : null;
    case "set-confidence":
      return isLeafTopicId(a.topicId) &&
        [1, 2, 3, 4, 5].includes(a.confidence as number)
        ? {
            kind: "set-confidence",
            topicId: a.topicId,
            confidence: a.confidence as Confidence,
          }
        : null;
    case "set-plan-state":
      return isLeafTopicId(a.topicId) && isPlanState(a.planState)
        ? { kind: "set-plan-state", topicId: a.topicId, planState: a.planState }
        : null;
    case "add-flashcard":
      return isLeafTopicId(a.topicId) &&
        typeof a.front === "string" &&
        a.front.trim() !== "" &&
        typeof a.back === "string" &&
        a.back.trim() !== ""
        ? {
            kind: "add-flashcard",
            topicId: a.topicId,
            front: a.front.trim(),
            back: a.back.trim(),
          }
        : null;
    case "add-quick-note":
      return isLeafTopicId(a.topicId) &&
        typeof a.text === "string" &&
        a.text.trim() !== ""
        ? {
            kind: "add-quick-note",
            topicId: a.topicId,
            text: a.text.trim(),
            noteKind: QUICK_KINDS.includes(a.noteKind as QuickNoteKind)
              ? (a.noteKind as QuickNoteKind)
              : "reminder",
          }
        : null;
    case "bookmark-topic":
      return isLeafTopicId(a.topicId) &&
        typeof a.collectionId === "string" &&
        BUILTIN_COLLECTION_IDS.includes(a.collectionId)
        ? { kind: "bookmark-topic", topicId: a.topicId, collectionId: a.collectionId }
        : null;
    case "set-vacation": {
      const from = a.from === null ? null : isValidDateStr(a.from) ? a.from : undefined;
      const to = a.to === null ? null : isValidDateStr(a.to) ? a.to : undefined;
      return from !== undefined && to !== undefined
        ? { kind: "set-vacation", from, to }
        : null;
    }
    case "set-weekend-strategy":
      return ["normal", "light", "revision-heavy"].includes(a.strategy as string)
        ? {
            kind: "set-weekend-strategy",
            strategy: a.strategy as PlannerSettings["weekendStrategy"],
          }
        : null;
    case "set-daily-hours":
      return typeof a.hours === "number" && a.hours >= 0.5 && a.hours <= 16
        ? { kind: "set-daily-hours", hours: Math.round(a.hours * 2) / 2 }
        : null;
    default:
      return null;
  }
}

export type ParsedActions = {
  actions: AiAction[];
  /** Reasons for dropped entries (surfaced in dev, logged otherwise). */
  rejected: number;
};

/**
 * Extract proposed actions from a model reply: the trailing fenced json
 * block (mentor protocol) or a bare JSON object/array (json-mode
 * features). Tolerant of prose around the block; strict about contents.
 */
export function parseAiActions(text: string): ParsedActions {
  const candidates: unknown[] = [];

  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  const rawJsons =
    fenced.length > 0 ? fenced.map((match) => match[1]) : [text];

  for (const raw of rawJsons) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) candidates.push(...parsed);
      else if (parsed && Array.isArray((parsed as { actions?: unknown[] }).actions))
        candidates.push(...(parsed as { actions: unknown[] }).actions);
      else if (parsed && typeof parsed === "object" && "kind" in parsed)
        candidates.push(parsed);
    } catch {
      // Not JSON — fine; prose replies simply carry no actions.
    }
  }

  const actions: AiAction[] = [];
  let rejected = 0;
  for (const candidate of candidates) {
    const action = validateAiAction(candidate);
    if (action) actions.push(action);
    else rejected += 1;
  }
  return { actions, rejected };
}

/** Reply text with the trailing action block removed (for display). */
export function stripActionBlock(text: string): string {
  return text
    .replace(/```(?:json)?\s*\{[\s\S]*?"actions"[\s\S]*?```/g, "")
    .trim();
}

const topicTitle = (topicId: string) => getNode(topicId)?.title ?? topicId;

/** Human sentence for the confirmation UI. */
export function describeAiAction(action: AiAction): string {
  switch (action.kind) {
    case "rebuild-plan":
      return "Rebuild the study schedule";
    case "plan-topic":
      return `Plan “${topicTitle(action.topicId)}” ${action.when === "this-week" ? "this week" : action.when}`;
    case "move-task":
      return `Move a session to ${action.date}${action.slot ? ` (${action.slot})` : ""}`;
    case "set-priority":
      return `Set priority of “${topicTitle(action.topicId)}” to ${action.priority ?? "auto"}`;
    case "set-confidence":
      return `Set confidence on “${topicTitle(action.topicId)}” to ${action.confidence}/5`;
    case "set-plan-state":
      return `Mark “${topicTitle(action.topicId)}” as ${action.planState}`;
    case "add-flashcard":
      return `Add flashcard to “${topicTitle(action.topicId)}”: ${action.front.slice(0, 60)}`;
    case "add-quick-note":
      return `Add ${action.noteKind} note to “${topicTitle(action.topicId)}”`;
    case "bookmark-topic":
      return `Bookmark “${topicTitle(action.topicId)}” in ${action.collectionId.replace("col-", "").replace(/-/g, " ")}`;
    case "set-vacation":
      return action.from
        ? `Set vacation ${action.from} → ${action.to ?? action.from}`
        : "Clear the vacation period";
    case "set-weekend-strategy":
      return `Set weekend strategy to ${action.strategy}`;
    case "set-daily-hours":
      return `Set daily study hours to ${action.hours}`;
  }
}

/**
 * The narrow surface the executor is allowed to touch — implemented by
 * the AI service over the REAL stores. Nothing here bypasses business
 * logic: every method maps 1:1 to an existing store action.
 */
export type AiActionGateway = {
  regeneratePlan: () => void;
  planTopicNow: (topicId: string, when: "today" | "tomorrow" | "this-week") => void;
  moveTask: (taskId: string, date: string, slot?: TaskSlot) => void;
  setTopicMeta: (
    topicId: string,
    meta: { priority?: Priority | null; confidence?: Confidence },
  ) => void;
  setPlanState: (topicId: string, planState: PlanState) => void;
  addFlashcard: (topicId: string, card: { front: string; back: string }) => void;
  addQuickNote: (topicId: string, text: string, kind: QuickNoteKind) => void;
  addBookmark: (topicId: string, collectionId: string) => void;
  updatePlannerSettings: (patch: Partial<PlannerSettings>) => boolean;
  hasTask: (taskId: string) => boolean;
};

export type AiActionResult = { ok: boolean; message: string };

/** Execute one confirmed action through the gateway. Never throws. */
export function executeAiAction(
  action: AiAction,
  gateway: AiActionGateway,
): AiActionResult {
  try {
    switch (action.kind) {
      case "rebuild-plan":
        gateway.regeneratePlan();
        return { ok: true, message: "Schedule rebuilt." };
      case "plan-topic":
        gateway.planTopicNow(action.topicId, action.when);
        return { ok: true, message: `Planned ${topicTitle(action.topicId)}.` };
      case "move-task":
        if (!gateway.hasTask(action.taskId))
          return { ok: false, message: "That session no longer exists." };
        gateway.moveTask(action.taskId, action.date, action.slot);
        return { ok: true, message: "Session moved." };
      case "set-priority":
        gateway.setTopicMeta(action.topicId, { priority: action.priority });
        return { ok: true, message: "Priority updated." };
      case "set-confidence":
        gateway.setTopicMeta(action.topicId, { confidence: action.confidence });
        return { ok: true, message: "Confidence updated." };
      case "set-plan-state":
        gateway.setPlanState(action.topicId, action.planState);
        return { ok: true, message: `Topic ${action.planState}.` };
      case "add-flashcard":
        gateway.addFlashcard(action.topicId, {
          front: action.front,
          back: action.back,
        });
        return { ok: true, message: "Flashcard added." };
      case "add-quick-note":
        gateway.addQuickNote(action.topicId, action.text, action.noteKind);
        return { ok: true, message: "Quick note added." };
      case "bookmark-topic":
        gateway.addBookmark(action.topicId, action.collectionId);
        return { ok: true, message: "Bookmarked." };
      case "set-vacation":
        return gateway.updatePlannerSettings({
          vacationFrom: action.from,
          vacationTo: action.to,
        })
          ? { ok: true, message: "Vacation period updated." }
          : { ok: false, message: "Set up the planner first." };
      case "set-weekend-strategy":
        return gateway.updatePlannerSettings({ weekendStrategy: action.strategy })
          ? { ok: true, message: "Weekend strategy updated." }
          : { ok: false, message: "Set up the planner first." };
      case "set-daily-hours":
        return gateway.updatePlannerSettings({ dailyHours: action.hours })
          ? { ok: true, message: "Daily hours updated." }
          : { ok: false, message: "Set up the planner first." };
    }
  } catch (error) {
    return {
      ok: false,
      message: `Action failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
