import type { TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { dayCapacity, slotForSession } from "./capacity";
import { addDays } from "./dates";
import { buildWorkPool, type WorkItem } from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

export type ScheduleInput = {
  settings: PlannerSettings;
  topics: TopicStateMap;
  /** Pending tasks that must be respected (pinned by the user), dated
   * `fromDate` or later. Their minutes reduce day capacity and topic
   * workload so nothing is double-booked. */
  pinnedTasks: PlannedTask[];
  /** First day to plan (usually today). */
  fromDate: string;
  horizonDays?: number;
  /** Injectable for deterministic tests. */
  makeId?: () => string;
};

/**
 * Round-robin rotation through the syllabus hierarchy:
 * exam stage (prelims/mains) → paper → unit → topic.
 * Guarantees subject mixing and prelims/mains + paper balance by
 * construction: consecutive picks always advance the rotation.
 */
function createRotation(pool: WorkItem[]) {
  const stageIds: string[] = [];
  const papersByStage = new Map<string, string[]>();
  const unitsByPaper = new Map<string, string[]>();
  const itemsByUnit = new Map<string, WorkItem[]>();

  for (const item of pool) {
    if (!papersByStage.has(item.stageId)) {
      stageIds.push(item.stageId);
      papersByStage.set(item.stageId, []);
    }
    const papers = papersByStage.get(item.stageId)!;
    if (!unitsByPaper.has(item.paperId)) {
      papers.push(item.paperId);
      unitsByPaper.set(item.paperId, []);
    }
    const units = unitsByPaper.get(item.paperId)!;
    if (!itemsByUnit.has(item.unitId)) {
      units.push(item.unitId);
      itemsByUnit.set(item.unitId, []);
    }
    itemsByUnit.get(item.unitId)!.push(item);
  }

  let stageCursor = 0;
  const paperCursor = new Map<string, number>();
  const unitCursor = new Map<string, number>();

  function nextFromUnit(unitId: string): WorkItem | null {
    const items = itemsByUnit.get(unitId);
    while (items && items.length > 0) {
      if (items[0].remaining > 0) return items[0];
      items.shift();
    }
    return null;
  }

  function nextFromPaper(paperId: string): WorkItem | null {
    const units = unitsByPaper.get(paperId) ?? [];
    for (let i = 0; i < units.length; i++) {
      const cursor = unitCursor.get(paperId) ?? 0;
      const unitId = units[cursor % units.length];
      unitCursor.set(paperId, cursor + 1);
      const item = nextFromUnit(unitId);
      if (item) return item;
    }
    return null;
  }

  function nextFromStage(stageId: string): WorkItem | null {
    const papers = papersByStage.get(stageId) ?? [];
    for (let i = 0; i < papers.length; i++) {
      const cursor = paperCursor.get(stageId) ?? 0;
      const paperId = papers[cursor % papers.length];
      paperCursor.set(stageId, cursor + 1);
      const item = nextFromPaper(paperId);
      if (item) return item;
    }
    return null;
  }

  return {
    /** The next topic to study, advancing the rotation. Null when done. */
    next(): WorkItem | null {
      for (let i = 0; i < stageIds.length; i++) {
        const stageId = stageIds[stageCursor % stageIds.length];
        stageCursor += 1;
        const item = nextFromStage(stageId);
        if (item) return item;
      }
      return null;
    },
  };
}

const defaultMakeId = () =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Generate auto study tasks from `fromDate` for the rolling horizon.
 * Pure with respect to its inputs (ID generation aside): the caller owns
 * persisting the result. Never overloads a day — capacity is the ceiling.
 */
export function generateSchedule(input: ScheduleInput): PlannedTask[] {
  const {
    settings,
    topics,
    pinnedTasks,
    fromDate,
    horizonDays = PLANNER_CONFIG.horizonDays,
    makeId = defaultMakeId,
  } = input;

  const pinnedMinutesByTopic = new Map<string, number>();
  const pinnedMinutesByDate = new Map<string, number>();
  for (const task of pinnedTasks) {
    pinnedMinutesByTopic.set(
      task.topicId,
      (pinnedMinutesByTopic.get(task.topicId) ?? 0) + task.minutes,
    );
    pinnedMinutesByDate.set(
      task.date,
      (pinnedMinutesByDate.get(task.date) ?? 0) + task.minutes,
    );
  }

  const pool = buildWorkPool(topics, pinnedMinutesByTopic);
  const rotation = createRotation(pool);
  const tasks: PlannedTask[] = [];
  const { minTaskMinutes } = PLANNER_CONFIG;

  for (let offset = 0; offset < horizonDays; offset++) {
    const date = addDays(fromDate, offset);
    const day = dayCapacity(date, settings);
    if (day.capacityMinutes <= 0) continue;

    const pinnedToday = pinnedMinutesByDate.get(date) ?? 0;
    let capacityLeft = day.capacityMinutes - pinnedToday;
    let sessionIndex = Math.ceil(pinnedToday / settings.sessionMinutes);

    while (capacityLeft >= minTaskMinutes && sessionIndex < day.sessions) {
      const item = rotation.next();
      if (!item) return tasks;

      const minutes = Math.min(
        settings.sessionMinutes,
        item.remaining,
        capacityLeft,
      );
      if (minutes < minTaskMinutes && item.remaining > minutes) break;

      tasks.push({
        id: makeId(),
        topicId: item.topicId,
        date,
        slot: slotForSession(sessionIndex, day.sessions),
        minutes,
        kind: "study",
        status: "pending",
        completedAt: null,
        createdBy: "auto",
      });
      item.remaining -= minutes;
      capacityLeft -= minutes;
      sessionIndex += 1;
    }
  }

  return tasks;
}
