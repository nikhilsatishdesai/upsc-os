import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { getNode } from "@/lib/syllabus";
import {
  DEFAULT_TOPIC_STATE,
  getTopicState,
  isDifficulty,
  isPriority,
  isStudyStage,
  revisionCountForStage,
  stageIndex,
  type Confidence,
  type StudyStage,
  type TopicState,
  type TopicStateMap,
} from "@/lib/stages";
import {
  effectiveEstimate,
  needsRevisions,
  remainingStudyMinutes,
} from "@/lib/planner/workload";
import { generateSchedule } from "@/lib/planner/scheduler";
import { addDays, isValidDateStr, todayStr } from "@/lib/planner/dates";
import { PLANNER_CONFIG, SLOT_ORDER } from "@/lib/planner/config";
import type {
  PlannedTask,
  PlannerSettings,
  TaskSlot,
} from "@/lib/planner/types";

export const STORE_VERSION = 3;
const MAX_RECENT = 8;

type AppState = {
  /** Study state per leaf topic. Defaults are never stored. */
  topics: TopicStateMap;
  displayName: string;
  /** Target Prelims date (YYYY-MM-DD, "" = unset). */
  examDate: string;
  recentTopics: string[];
  /** Planner configuration; null until first-time setup completes. */
  planner: PlannerSettings | null;
  /** All planned tasks (pending + history), keyed by id. */
  tasks: Record<string, PlannedTask>;
  /** Last date (YYYY-MM-DD) the plan was (re)generated. */
  lastPlannedAt: string | null;

  setStage: (topicId: string, stage: StudyStage) => void;
  setTopicMeta: (
    topicId: string,
    meta: Partial<
      Pick<
        TopicState,
        "priority" | "difficulty" | "confidence" | "estimatedMinutes"
      >
    >,
  ) => void;
  setDisplayName: (name: string) => void;
  setExamDate: (date: string) => void;
  touchRecent: (topicId: string) => void;

  configurePlanner: (prelimsDate: string, settings: PlannerSettings) => void;
  regeneratePlan: () => void;
  completeTask: (taskId: string) => void;
  skipTask: (taskId: string) => void;
  reopenTask: (taskId: string) => void;
  moveTask: (taskId: string, date: string, slot?: TaskSlot) => void;
  splitTask: (taskId: string) => void;
  mergeTasks: (taskId: string, otherId: string) => void;

  importState: (data: ExportedState) => void;
  resetAll: () => void;
};

export type ExportedState = {
  app: "upsc-os";
  version: number;
  exportedAt: string;
  topics: TopicStateMap;
  displayName: string;
  examDate: string;
  recentTopics: string[];
  planner: PlannerSettings | null;
  tasks: Record<string, PlannedTask>;
  lastPlannedAt: string | null;
};

const initialData = {
  topics: {} as TopicStateMap,
  displayName: "",
  examDate: "",
  recentTopics: [] as string[],
  planner: null as PlannerSettings | null,
  tasks: {} as Record<string, PlannedTask>,
  lastPlannedAt: null as string | null,
};

/** Update one topic immutably, applying defaults first. */
function withTopic(
  topics: TopicStateMap,
  topicId: string,
  update: (current: TopicState) => TopicState,
): TopicStateMap {
  return { ...topics, [topicId]: update(getTopicState(topics, topicId)) };
}

/**
 * When the next spaced revision falls due for a topic that was last
 * studied today: 3 / 10 / 30 days out depending on revisions already done.
 * Null when no further spaced revision applies.
 */
function nextRevisionDate(
  stage: StudyStage,
  revisionCount: number,
  from: string,
): string | null {
  const intervals = PLANNER_CONFIG.revisionIntervals;
  const eligible =
    stageIndex(stage) >= stageIndex("first-reading") &&
    stageIndex(stage) < stageIndex("revision-3") &&
    revisionCount < intervals.length;
  return eligible ? addDays(from, intervals[revisionCount]) : null;
}

function regenerate(state: {
  planner: PlannerSettings | null;
  topics: TopicStateMap;
  tasks: Record<string, PlannedTask>;
}): { tasks: Record<string, PlannedTask>; lastPlannedAt: string } {
  const today = todayStr();
  const tasks: Record<string, PlannedTask> = {};

  for (const task of Object.values(state.tasks)) {
    if (task.status === "pending" && task.date < today) {
      // Missed work: keep for history, its topic re-enters the pool below.
      tasks[task.id] = { ...task, status: "missed" };
      continue;
    }
    if (task.status === "pending") {
      const topic = getTopicState(state.topics, task.topicId);
      const stale =
        task.kind === "revision"
          ? !needsRevisions(topic)
          : remainingStudyMinutes(task.topicId, topic) <= 0;
      // Auto tasks are regenerated; pinned tasks for finished work drop.
      if (task.createdBy === "auto" || stale) continue;
    }
    tasks[task.id] = task;
  }

  if (state.planner) {
    const pinned: PlannedTask[] = [];
    const usedMinutesByDate = new Map<string, number>();
    for (const task of Object.values(tasks)) {
      if (task.status === "pending" && task.date >= today) {
        pinned.push(task);
      } else if (task.status === "completed" && task.date >= today) {
        // Work already done today consumed real capacity.
        usedMinutesByDate.set(
          task.date,
          (usedMinutesByDate.get(task.date) ?? 0) + task.minutes,
        );
      }
    }
    for (const task of generateSchedule({
      settings: state.planner,
      topics: state.topics,
      pinnedTasks: pinned,
      usedMinutesByDate,
      fromDate: today,
    })) {
      tasks[task.id] = task;
    }
  }

  return { tasks, lastPlannedAt: today };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      setStage: (topicId, stage) =>
        set((state) => {
          const today = todayStr();
          return {
            topics: withTopic(state.topics, topicId, (current) => {
              const revisionCount =
                stage === "not-started"
                  ? 0
                  : Math.max(
                      current.revisionCount,
                      revisionCountForStage(stage),
                    );
              return {
                ...current,
                stage,
                studiedMinutes:
                  stage === "not-started" ? 0 : current.studiedMinutes,
                lastStudiedAt:
                  stageIndex(stage) > stageIndex(current.stage)
                    ? today
                    : current.lastStudiedAt,
                revisionCount,
                // Manual stage changes (re)anchor the spaced-revision clock.
                nextRevisionAt: nextRevisionDate(stage, revisionCount, today),
              };
            }),
          };
        }),

      setTopicMeta: (topicId, meta) =>
        set((state) => ({
          topics: withTopic(state.topics, topicId, (current) => ({
            ...current,
            ...meta,
          })),
        })),

      setDisplayName: (displayName) => set({ displayName }),
      setExamDate: (examDate) => set({ examDate }),

      touchRecent: (topicId) =>
        set((state) => ({
          recentTopics: [
            topicId,
            ...state.recentTopics.filter((id) => id !== topicId),
          ].slice(0, MAX_RECENT),
        })),

      configurePlanner: (prelimsDate, settings) => {
        set({ examDate: prelimsDate, planner: settings });
        get().regeneratePlan();
      },

      regeneratePlan: () => set((state) => regenerate(state)),

      completeTask: (taskId) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task || task.status !== "pending") return state;
          const today = todayStr();
          const topics = withTopic(state.topics, task.topicId, (current) => {
            if (task.kind === "revision") {
              // Climb the revision ladder and schedule the next one.
              const revisionCount = Math.min(
                current.revisionCount + 1,
                PLANNER_CONFIG.revisionIntervals.length,
              );
              const ladder: StudyStage[] = [
                "revision-1",
                "revision-2",
                "revision-3",
              ];
              const promoted = ladder[revisionCount - 1];
              const stage =
                stageIndex(promoted) > stageIndex(current.stage)
                  ? promoted
                  : current.stage;
              return {
                ...current,
                revisionCount,
                stage,
                lastStudiedAt: today,
                nextRevisionAt: nextRevisionDate(stage, revisionCount, today),
              };
            }
            const studiedMinutes = current.studiedMinutes + task.minutes;
            const finished =
              current.stage === "not-started" &&
              studiedMinutes >= effectiveEstimate(task.topicId, current);
            const stage = finished ? "first-reading" : current.stage;
            return {
              ...current,
              studiedMinutes,
              lastStudiedAt: today,
              stage,
              // Finishing the first reading starts the revision clock.
              nextRevisionAt: finished
                ? nextRevisionDate(stage, current.revisionCount, today)
                : current.nextRevisionAt,
            };
          });
          return {
            topics,
            tasks: {
              ...state.tasks,
              [taskId]: {
                ...task,
                status: "completed",
                completedAt: new Date().toISOString(),
              },
            },
          };
        }),

      skipTask: (taskId) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task || task.status !== "pending") return state;
          return {
            tasks: { ...state.tasks, [taskId]: { ...task, status: "skipped" } },
          };
        }),

      reopenTask: (taskId) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task || task.status === "pending" || task.status === "missed")
            return state;
          let topics = state.topics;
          if (task.status === "completed" && task.kind === "revision") {
            topics = withTopic(state.topics, task.topicId, (current) => {
              const revisionCount = Math.max(0, current.revisionCount - 1);
              // Conservative revert: step back one revision stage; the
              // exact prior stage (e.g. notes-made) can be reset by hand.
              const ladder: StudyStage[] = [
                "first-reading",
                "revision-1",
                "revision-2",
              ];
              const stage =
                revisionCountForStage(current.stage) > revisionCount
                  ? ladder[revisionCount]
                  : current.stage;
              return {
                ...current,
                revisionCount,
                stage,
                nextRevisionAt: nextRevisionDate(
                  stage,
                  revisionCount,
                  todayStr(),
                ),
              };
            });
          } else if (task.status === "completed") {
            topics = withTopic(state.topics, task.topicId, (current) => ({
              ...current,
              studiedMinutes: Math.max(
                0,
                current.studiedMinutes - task.minutes,
              ),
              // Only undo an automatic first-reading promotion, never a
              // stage the user set by hand beyond it.
              stage:
                current.stage === "first-reading"
                  ? "not-started"
                  : current.stage,
              nextRevisionAt:
                current.stage === "first-reading"
                  ? null
                  : current.nextRevisionAt,
            }));
          }
          return {
            topics,
            tasks: {
              ...state.tasks,
              [taskId]: { ...task, status: "pending", completedAt: null },
            },
          };
        }),

      moveTask: (taskId, date, slot) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task || task.status !== "pending" || !isValidDateStr(date))
            return state;
          return {
            tasks: {
              ...state.tasks,
              [taskId]: {
                ...task,
                date,
                slot: slot ?? task.slot,
                createdBy: "user",
              },
            },
          };
        }),

      splitTask: (taskId) =>
        set((state) => {
          const task = state.tasks[taskId];
          const min = PLANNER_CONFIG.minTaskMinutes;
          if (!task || task.status !== "pending" || task.minutes < min * 2)
            return state;
          const first = Math.round(task.minutes / 2 / 5) * 5;
          const second = task.minutes - first;
          const sibling: PlannedTask = {
            ...task,
            id: `${task.id}-b`,
            minutes: second,
            createdBy: "user",
          };
          return {
            tasks: {
              ...state.tasks,
              [taskId]: { ...task, minutes: first, createdBy: "user" },
              [sibling.id]: sibling,
            },
          };
        }),

      mergeTasks: (taskId, otherId) =>
        set((state) => {
          const a = state.tasks[taskId];
          const b = state.tasks[otherId];
          if (
            !a ||
            !b ||
            a.id === b.id ||
            a.status !== "pending" ||
            b.status !== "pending" ||
            a.topicId !== b.topicId ||
            a.date !== b.date
          )
            return state;
          const tasks = { ...state.tasks };
          delete tasks[otherId];
          tasks[taskId] = {
            ...a,
            minutes: a.minutes + b.minutes,
            createdBy: "user",
          };
          return { tasks };
        }),

      importState: (data) =>
        set({
          topics: data.topics,
          displayName: data.displayName,
          examDate: data.examDate,
          recentTopics: data.recentTopics,
          planner: data.planner,
          tasks: data.tasks,
          lastPlannedAt: data.lastPlannedAt,
        }),

      resetAll: () => set({ ...initialData }),
    }),
    {
      name: "upsc-os-store",
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        let state = persisted as Partial<AppState>;
        if (version < 2) {
          state = migrateV1(persisted);
        }
        if (version < 3) {
          state = migrateV2ToV3(state);
        }
        return state;
      },
      partialize: (state) => ({
        topics: state.topics,
        displayName: state.displayName,
        examDate: state.examDate,
        recentTopics: state.recentTopics,
        planner: state.planner,
        tasks: state.tasks,
        lastPlannedAt: state.lastPlannedAt,
      }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* V1 → V2 migration (also used for importing old backup files)        */
/* ------------------------------------------------------------------ */

/** Map a V1 status to the V2 stage ladder. "in-progress" becomes a
 * half-studied not-started topic so it stays in the planner's pool. */
export function topicStateFromV1Status(status: string): TopicState | null {
  switch (status) {
    case "in-progress":
      return {
        ...DEFAULT_TOPIC_STATE,
        studiedMinutes: Math.round(PLANNER_CONFIG.defaultTopicMinutes / 2),
      };
    case "completed":
      return { ...DEFAULT_TOPIC_STATE, stage: "first-reading" };
    case "revised":
      return { ...DEFAULT_TOPIC_STATE, stage: "revision-1", revisionCount: 1 };
    default:
      return null;
  }
}

function migrateV1(persisted: unknown): Partial<AppState> {
  const old = (persisted ?? {}) as Record<string, unknown>;
  const topics: TopicStateMap = {};
  if (typeof old.progress === "object" && old.progress !== null) {
    for (const [id, status] of Object.entries(
      old.progress as Record<string, unknown>,
    )) {
      const state =
        typeof status === "string" ? topicStateFromV1Status(status) : null;
      if (state && getNode(id)) topics[id] = state;
    }
  }
  return {
    ...initialData,
    topics,
    displayName: typeof old.displayName === "string" ? old.displayName : "",
    examDate: isValidDateStr(old.examDate) ? old.examDate : "",
    recentTopics: Array.isArray(old.recentTopics)
      ? old.recentTopics.filter(
          (id): id is string => typeof id === "string" && !!getNode(id),
        )
      : [],
  };
}

/**
 * V2 → V3: difficulty stored as a concrete value becomes an override-only
 * field. "medium" (the old always-on default) converts to null so the
 * curated intelligence layer takes over; explicit easy/hard choices stay.
 */
function migrateV2ToV3(state: Partial<AppState>): Partial<AppState> {
  const topics: TopicStateMap = {};
  for (const [id, topic] of Object.entries(state.topics ?? {})) {
    topics[id] = {
      ...DEFAULT_TOPIC_STATE,
      ...topic,
      priority: topic.priority ?? null,
      difficulty:
        (topic.difficulty as string) === "medium" ? null : topic.difficulty,
    };
  }
  return { ...state, topics };
}

/* ------------------------------------------------------------------ */
/* Backup export / import                                              */
/* ------------------------------------------------------------------ */

export function exportStateToJSON(): string {
  const state = useAppStore.getState();
  const data: ExportedState = {
    app: "upsc-os",
    version: STORE_VERSION,
    exportedAt: new Date().toISOString(),
    topics: state.topics,
    displayName: state.displayName,
    examDate: state.examDate,
    recentTopics: state.recentTopics,
    planner: state.planner,
    tasks: state.tasks,
    lastPlannedAt: state.lastPlannedAt,
  };
  return JSON.stringify(data, null, 2);
}

const CONFIDENCES: Confidence[] = [1, 2, 3, 4, 5];
const TASK_STATUSES = ["pending", "completed", "skipped", "missed"];

function sanitizeTopics(raw: unknown, fileVersion: number): TopicStateMap {
  const topics: TopicStateMap = {};
  if (typeof raw !== "object" || raw === null) return topics;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!getNode(id) || typeof value !== "object" || value === null) continue;
    const t = value as Record<string, unknown>;
    if (!isStudyStage(t.stage)) continue;
    // In V2 files "medium" difficulty was the stored default, not a choice.
    const difficulty =
      isDifficulty(t.difficulty) &&
      !(fileVersion < 3 && t.difficulty === "medium")
        ? t.difficulty
        : null;
    topics[id] = {
      stage: t.stage,
      studiedMinutes:
        typeof t.studiedMinutes === "number" && t.studiedMinutes >= 0
          ? t.studiedMinutes
          : 0,
      lastStudiedAt: isValidDateStr(t.lastStudiedAt) ? t.lastStudiedAt : null,
      revisionCount:
        typeof t.revisionCount === "number" && t.revisionCount >= 0
          ? t.revisionCount
          : revisionCountForStage(t.stage),
      priority: isPriority(t.priority) ? t.priority : null,
      difficulty,
      confidence: CONFIDENCES.includes(t.confidence as Confidence)
        ? (t.confidence as Confidence)
        : 3,
      estimatedMinutes:
        typeof t.estimatedMinutes === "number" && t.estimatedMinutes > 0
          ? t.estimatedMinutes
          : null,
      nextRevisionAt: isValidDateStr(t.nextRevisionAt)
        ? t.nextRevisionAt
        : null,
    };
  }
  return topics;
}

function sanitizeTasks(raw: unknown): Record<string, PlannedTask> {
  const tasks: Record<string, PlannedTask> = {};
  if (typeof raw !== "object" || raw === null) return tasks;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const t = value as Record<string, unknown>;
    if (
      typeof t.topicId !== "string" ||
      !getNode(t.topicId) ||
      !isValidDateStr(t.date) ||
      !SLOT_ORDER.includes(t.slot as TaskSlot) ||
      typeof t.minutes !== "number" ||
      t.minutes <= 0 ||
      !TASK_STATUSES.includes(t.status as string)
    )
      continue;
    tasks[id] = {
      id,
      topicId: t.topicId,
      date: t.date,
      slot: t.slot as TaskSlot,
      minutes: Math.round(t.minutes),
      kind: t.kind === "revision" ? "revision" : "study",
      status: t.status as PlannedTask["status"],
      completedAt: typeof t.completedAt === "string" ? t.completedAt : null,
      createdBy: t.createdBy === "user" ? "user" : "auto",
    };
  }
  return tasks;
}

function sanitizePlanner(raw: unknown): PlannerSettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (!isValidDateStr(p.mainsDate)) return null;
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const time = (value: unknown, fallback: string) =>
    typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
      ? value
      : fallback;
  return {
    mainsDate: p.mainsDate,
    dailyHours: Math.min(16, Math.max(0.5, num(p.dailyHours, 6))),
    wakeUpTime: time(p.wakeUpTime, "06:00"),
    studyStartTime: time(p.studyStartTime, "07:00"),
    weeklyOffDay: Math.min(6, Math.max(-1, Math.round(num(p.weeklyOffDay, -1)))),
    maxSessionsPerDay: Math.min(8, Math.max(1, Math.round(num(p.maxSessionsPerDay, 3)))),
    sessionMinutes: PLANNER_CONFIG.sessionOptions.includes(
      num(p.sessionMinutes, 60),
    )
      ? (num(p.sessionMinutes, 60) as number)
      : 60,
  };
}

/**
 * Validate a backup file's contents (V1 or V2 format). Returns the parsed
 * state or a friendly error message — never throws.
 */
export function parseExportedState(
  json: string,
): { ok: true; data: ExportedState } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "This file does not contain backup data." };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== "upsc-os") {
    return { ok: false, error: "This file is not a UPSC OS backup." };
  }
  if (typeof obj.version !== "number" || obj.version > STORE_VERSION) {
    return {
      ok: false,
      error: "This backup was created by a newer version of UPSC OS.",
    };
  }

  let topics: TopicStateMap;
  if (obj.version < 2) {
    topics = migrateV1(obj).topics ?? {};
  } else {
    topics = sanitizeTopics(obj.topics, obj.version);
  }

  return {
    ok: true,
    data: {
      app: "upsc-os",
      version: STORE_VERSION,
      exportedAt:
        typeof obj.exportedAt === "string"
          ? obj.exportedAt
          : new Date().toISOString(),
      topics,
      displayName: typeof obj.displayName === "string" ? obj.displayName : "",
      examDate: isValidDateStr(obj.examDate) ? obj.examDate : "",
      recentTopics: Array.isArray(obj.recentTopics)
        ? obj.recentTopics
            .filter(
              (id): id is string => typeof id === "string" && !!getNode(id),
            )
            .slice(0, MAX_RECENT)
        : [],
      planner: obj.version < 2 ? null : sanitizePlanner(obj.planner),
      tasks: obj.version < 2 ? {} : sanitizeTasks(obj.tasks),
      lastPlannedAt: isValidDateStr(obj.lastPlannedAt)
        ? obj.lastPlannedAt
        : null,
    },
  };
}

/** Convenience: tomorrow's date for "move to tomorrow" actions. */
export function tomorrowStr(): string {
  return addDays(todayStr(), 1);
}
