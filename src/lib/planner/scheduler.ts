import { makeId } from "@/lib/id";
import type { TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG, withPlannerDefaults } from "./config";
import { dayCapacity, slotForSession } from "./capacity";
import { addDays, weekdayOf } from "./dates";
import {
  buildRevisionQueue,
  buildWorkPool,
  type WorkItem,
} from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

export type ScheduleInput = {
  settings: PlannerSettings;
  topics: TopicStateMap;
  /** Prelims date ("" when unset) — feeds the dynamic priority scores. */
  examDate?: string;
  /** Pending tasks that must be respected (pinned by the user), dated
   * `fromDate` or later. Their minutes reduce day capacity and topic
   * workload so nothing is double-booked. */
  pinnedTasks: PlannedTask[];
  /** Minutes already spent per date (completed tasks today) — consumed
   * capacity that regeneration must not reuse. */
  usedMinutesByDate?: Map<string, number>;
  /** Transient capacity damping (burnout prevention), 0–1. */
  loadFactor?: number;
  /** Restrict fresh study to these topics (a focus collection). Revisions
   * are never restricted — memory maintenance covers the whole scope. */
  studyTopicFilter?: Set<string> | null;
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
 * construction. Within a unit, higher-priority topics come first, so
 * critical material is reached earliest. `paperWeights` (personal subject
 * emphasis) lets a paper come round 2–3× as often, interleaved so the mix
 * stays varied. `next(allowed)` restricts a pick to a set of papers (a
 * day's subject focus) without disturbing the rotation for other days.
 */
function createRotation(pool: WorkItem[], paperWeights: Record<string, number> = {}) {
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

  // Weighted interleave: round r includes every paper with weight > r.
  for (const [stageId, papers] of papersByStage) {
    const weightOf = (paperId: string) =>
      Math.max(1, Math.min(3, Math.round(paperWeights[paperId] ?? 1)));
    const maxWeight = Math.max(1, ...papers.map(weightOf));
    const cycle: string[] = [];
    for (let round = 0; round < maxWeight; round++) {
      for (const paperId of papers) {
        if (weightOf(paperId) > round) cycle.push(paperId);
      }
    }
    papersByStage.set(stageId, cycle);
  }

  // Dynamic-score ordering within each unit (stable: syllabus tiebreak).
  for (const items of itemsByUnit.values()) {
    items.sort((a, b) => b.score - a.score);
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

  function nextFromStage(
    stageId: string,
    allowed: Set<string> | null,
  ): WorkItem | null {
    const papers = papersByStage.get(stageId) ?? [];
    const cursor = paperCursor.get(stageId) ?? 0;
    for (let i = 0; i < papers.length; i++) {
      const paperId = papers[(cursor + i) % papers.length];
      if (allowed && !allowed.has(paperId)) continue;
      const item = nextFromPaper(paperId);
      if (item) {
        paperCursor.set(stageId, cursor + i + 1);
        return item;
      }
    }
    return null;
  }

  return {
    /** The next topic to study (optionally only from `allowed` papers),
     * advancing the rotation. Null when nothing qualifies. */
    next(allowed: Set<string> | null = null): WorkItem | null {
      for (let i = 0; i < stageIds.length; i++) {
        const stageId = stageIds[(stageCursor + i) % stageIds.length];
        const item = nextFromStage(stageId, allowed);
        if (item) {
          stageCursor += i + 1;
          return item;
        }
      }
      return null;
    },
  };
}

const defaultMakeId = () => makeId("t");

/**
 * Recovery-day logic: the user's weekly off day when set; otherwise a rest
 * day is inserted automatically after `maxConsecutiveStudyDays` in a row
 * (burnout prevention).
 */
export function isRecoveryDay(
  date: string,
  dayOffset: number,
  settings: PlannerSettings,
): boolean {
  if (settings.weeklyOffDay >= 0) {
    return weekdayOf(date) === settings.weeklyOffDay;
  }
  return dayOffset % (PLANNER_CONFIG.maxConsecutiveStudyDays + 1) ===
    PLANNER_CONFIG.maxConsecutiveStudyDays;
}

/**
 * Generate auto tasks from `fromDate` for the rolling horizon.
 *
 * Per day, in order:
 *  1. Due spaced revisions (capped at `revisionShareCap` of capacity) —
 *     time-critical work first.
 *  2. First-reading study sessions from the priority-aware rotation, with
 *     hard-topic spacing (never two hard sessions back-to-back when an
 *     alternative exists).
 *
 * Never overloads a day — capacity minus pinned/used minutes is a ceiling.
 * Pure with respect to its inputs (ID generation aside).
 */
export function generateSchedule(input: ScheduleInput): PlannedTask[] {
  const {
    topics,
    examDate = "",
    pinnedTasks,
    usedMinutesByDate = new Map<string, number>(),
    loadFactor = 1,
    studyTopicFilter = null,
    fromDate,
    horizonDays = PLANNER_CONFIG.horizonDays,
    makeId = defaultMakeId,
  } = input;
  // Tolerate settings persisted by older app versions.
  const settings = withPlannerDefaults(input.settings);

  const pinnedStudyByTopic = new Map<string, number>();
  const pinnedRevisionTopics = new Set<string>();
  const pinnedMinutesByDate = new Map<string, number>();
  for (const task of pinnedTasks) {
    if (task.kind === "revision") {
      pinnedRevisionTopics.add(task.topicId);
    } else {
      pinnedStudyByTopic.set(
        task.topicId,
        (pinnedStudyByTopic.get(task.topicId) ?? 0) + task.minutes,
      );
    }
    pinnedMinutesByDate.set(
      task.date,
      (pinnedMinutesByDate.get(task.date) ?? 0) + task.minutes,
    );
  }

  const ctx = { today: fromDate, examDate };
  const pool = buildWorkPool(topics, pinnedStudyByTopic, ctx, studyTopicFilter);
  // Continuity first: readings already begun finish before fresh topics
  // enter the mix — they skip the subject rotation's revisit cadence.
  const continuity = pool
    .filter((item) => item.started)
    .sort((a, b) => b.score - a.score);
  const rotation = createRotation(
    pool.filter((item) => !item.started),
    settings.paperWeights,
  );
  const horizonEnd = addDays(fromDate, horizonDays - 1);
  const revisionQueue = buildRevisionQueue(
    topics,
    horizonEnd,
    pinnedRevisionTopics,
    settings.revisionIntervals.length,
    ctx,
  );
  let revisionIndex = 0;

  const tasks: PlannedTask[] = [];
  const { minTaskMinutes, hardSpacingLookahead, revisionShareCap } =
    PLANNER_CONFIG;
  let lastDifficultyHard = false;

  const makeTask = (
    topicId: string,
    date: string,
    slotIndex: number,
    totalSessions: number,
    minutes: number,
    kind: PlannedTask["kind"],
  ): PlannedTask => ({
    id: makeId(),
    topicId,
    date,
    slot: slotForSession(slotIndex, totalSessions),
    minutes,
    kind,
    status: "pending",
    completedAt: null,
    createdBy: "auto",
  });

  for (let offset = 0; offset < horizonDays; offset++) {
    const date = addDays(fromDate, offset);
    if (isRecoveryDay(date, offset, settings)) continue;
    const day = dayCapacity(date, settings, loadFactor);
    if (day.capacityMinutes <= 0) continue;

    const weekday = weekdayOf(date);
    const isWeekend = weekday === 0 || weekday === 6;
    // The personal timetable's subject focus for this weekday (fresh study
    // only — due revisions below are never restricted).
    const focusPapers = settings.dayFocus?.[weekday];
    const focus =
      focusPapers && focusPapers.length > 0 ? new Set(focusPapers) : null;
    const inFocus = (item: WorkItem) => !focus || focus.has(item.paperId);
    const revisionCap =
      settings.weekendStrategy === "revision-heavy" && isWeekend
        ? 1
        : revisionShareCap;

    const reserved =
      (pinnedMinutesByDate.get(date) ?? 0) +
      (usedMinutesByDate.get(date) ?? 0);
    let capacityLeft = day.capacityMinutes - reserved;
    let sessionIndex = Math.ceil(reserved / settings.sessionMinutes);
    let hardUsed = 0;
    // "Easy-first" mornings behave as if a hard session just happened,
    // steering the first pick towards lighter material.
    lastDifficultyHard = settings.morningDifficulty === "easy-first";

    // 1. Due revisions first (time-critical), capped per day so fresh
    // study never starves entirely under a revision backlog — except on
    // revision-heavy weekends, where revisions may take the whole day.
    let revisionBudget = Math.min(
      capacityLeft,
      Math.round(day.capacityMinutes * revisionCap),
    );
    while (
      revisionIndex < revisionQueue.length &&
      revisionQueue[revisionIndex].dueDate <= date &&
      capacityLeft >= minTaskMinutes &&
      sessionIndex < day.sessions &&
      revisionBudget >= minTaskMinutes
    ) {
      const due = revisionQueue[revisionIndex];
      const minutes = Math.min(due.minutes, capacityLeft, revisionBudget);
      if (minutes < minTaskMinutes) break;
      tasks.push(
        makeTask(due.topicId, date, sessionIndex, day.sessions, minutes, "revision"),
      );
      revisionIndex += 1;
      capacityLeft -= minutes;
      revisionBudget -= minutes;
      sessionIndex += 1;
      lastDifficultyHard = due.difficulty === "hard";
      if (due.difficulty === "hard") hardUsed += 1;
    }

    // 2. Continuity: finish partially-read topics before anything fresh
    // (one per day at most keeps the day varied).
    const continuityIndex = continuity.findIndex(inFocus);
    if (
      continuityIndex >= 0 &&
      capacityLeft >= minTaskMinutes &&
      sessionIndex < day.sessions
    ) {
      const item = continuity[continuityIndex];
      const minutes = Math.min(
        settings.sessionMinutes,
        item.remaining,
        capacityLeft,
      );
      if (minutes >= Math.min(minTaskMinutes, item.remaining)) {
        tasks.push(
          makeTask(item.topicId, date, sessionIndex, day.sessions, minutes, "study"),
        );
        item.remaining -= minutes;
        capacityLeft -= minutes;
        sessionIndex += 1;
        lastDifficultyHard = item.difficulty === "hard";
        if (item.difficulty === "hard") hardUsed += 1;
        if (item.remaining <= 0) continuity.splice(continuityIndex, 1);
      }
    }

    // 3. Score-ordered study fill with cognitive-load balancing:
    // never two hard sessions back-to-back when avoidable, and never more
    // than `maxHardPerDay` hard sessions in a day (hard stop). The sweep
    // may pass many hard-over-quota candidates — their turn simply comes
    // again on a later day.
    const pick = (allowed: Set<string> | null): WorkItem | null => {
      let softFallback: WorkItem | null = null;
      let softLooks = 0;
      for (let look = 0; look < PLANNER_CONFIG.pickSweepLimit; look++) {
        const candidate = rotation.next(allowed);
        if (!candidate) break;
        const hard = candidate.difficulty === "hard";
        if (hard && hardUsed >= settings.maxHardPerDay) continue;
        if (hard && lastDifficultyHard && softLooks < hardSpacingLookahead) {
          softFallback = softFallback ?? candidate;
          softLooks += 1;
          continue;
        }
        return candidate;
      }
      return softFallback;
    };
    while (capacityLeft >= minTaskMinutes && sessionIndex < day.sessions) {
      // A focused day fills from its focus papers; once those have no work
      // left, the day falls back to the normal mix rather than idling.
      const item = pick(focus) ?? (focus ? pick(null) : null);
      if (!item) break;

      const minutes = Math.min(
        settings.sessionMinutes,
        item.remaining,
        capacityLeft,
      );
      if (minutes < minTaskMinutes && item.remaining > minutes) break;

      tasks.push(
        makeTask(item.topicId, date, sessionIndex, day.sessions, minutes, "study"),
      );
      item.remaining -= minutes;
      capacityLeft -= minutes;
      sessionIndex += 1;
      lastDifficultyHard = item.difficulty === "hard";
      if (item.difficulty === "hard") hardUsed += 1;
    }
  }

  return tasks;
}
