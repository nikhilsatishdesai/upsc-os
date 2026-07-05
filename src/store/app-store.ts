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
  buildRevisionQueue,
  effectiveEstimate,
  needsRevisions,
  remainingStudyMinutes,
  totalRemainingMinutes,
} from "@/lib/planner/workload";
import { generateSchedule } from "@/lib/planner/scheduler";
import { burnoutIndicator, fatigueIndicator } from "@/lib/planner/analytics";
import { studyHealth } from "@/lib/planner/health";
import { addDays, isValidDateStr, todayStr } from "@/lib/planner/dates";
import {
  PLANNER_CONFIG,
  PLANNER_SETTING_DEFAULTS,
  SLOT_ORDER,
  withPlannerDefaults,
} from "@/lib/planner/config";
import type {
  DailySnapshot,
  PlannedTask,
  PlannerSettings,
  TaskSlot,
} from "@/lib/planner/types";
import {
  exportKnowledge,
  sanitizeKnowledgeExport,
  type KnowledgeExport,
} from "@/store/knowledge-store";

export const STORE_VERSION = 4;
/** Backup-file format version (5 added the knowledge section). */
export const BACKUP_VERSION = 5;
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
  /** One intelligence snapshot per day, for trend analytics. */
  snapshots: Record<string, DailySnapshot>;

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
  snapshots: Record<string, DailySnapshot>;
  /** Knowledge OS data (notes, cards, PYQs…); null in pre-v5 backups. */
  knowledge: KnowledgeExport | null;
};

const initialData = {
  topics: {} as TopicStateMap,
  displayName: "",
  examDate: "",
  recentTopics: [] as string[],
  planner: null as PlannerSettings | null,
  tasks: {} as Record<string, PlannedTask>,
  lastPlannedAt: null as string | null,
  snapshots: {} as Record<string, DailySnapshot>,
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
 * studied on `from`, given the (customisable) interval schedule.
 * Null when no further spaced revision applies.
 */
function nextRevisionDate(
  stage: StudyStage,
  revisionCount: number,
  from: string,
  intervals: readonly number[],
): string | null {
  const eligible =
    stageIndex(stage) >= stageIndex("first-reading") &&
    stage !== "exam-ready" &&
    revisionCount < intervals.length;
  return eligible ? addDays(from, intervals[revisionCount]) : null;
}

/** The active revision-interval schedule (settings override config). */
function activeIntervals(planner: PlannerSettings | null): readonly number[] {
  if (!planner) return PLANNER_CONFIG.revisionIntervals;
  return withPlannerDefaults(planner).revisionIntervals;
}

/**
 * Adaptive replan. Completed work never moves; overdue pending work becomes
 * `missed` history (feeding the topic's behaviour counters); auto tasks
 * regenerate from the live workload; pinned tasks survive; rising burnout
 * transiently damps capacity so the plan stays sustainable.
 */
function regenerate(state: {
  planner: PlannerSettings | null;
  topics: TopicStateMap;
  tasks: Record<string, PlannedTask>;
  examDate: string;
  snapshots: Record<string, DailySnapshot>;
}): {
  tasks: Record<string, PlannedTask>;
  topics: TopicStateMap;
  lastPlannedAt: string;
  snapshots: Record<string, DailySnapshot>;
} {
  const today = todayStr();
  const tasks: Record<string, PlannedTask> = {};
  let topics = state.topics;
  const settings = state.planner ? withPlannerDefaults(state.planner) : null;
  const intervals = settings
    ? settings.revisionIntervals
    : PLANNER_CONFIG.revisionIntervals;

  for (const task of Object.values(state.tasks)) {
    if (task.status === "pending" && task.date < today) {
      // Missed work: keep for history; the topic's counters make its
      // dynamic priority rise so it stops being avoidable.
      tasks[task.id] = { ...task, status: "missed" };
      topics = withTopic(topics, task.topicId, (current) => ({
        ...current,
        missedSessions: current.missedSessions + 1,
        postponeCount: current.postponeCount + 1,
      }));
      continue;
    }
    if (task.status === "pending") {
      const topic = getTopicState(topics, task.topicId);
      const stale =
        task.kind === "revision"
          ? !needsRevisions(topic, intervals.length)
          : remainingStudyMinutes(task.topicId, topic) <= 0;
      // Auto tasks are regenerated; pinned tasks for finished work drop.
      if (task.createdBy === "auto" || stale) continue;
    }
    tasks[task.id] = task;
  }

  let snapshots = state.snapshots;
  if (settings) {
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

    // Burnout prevention: transient capacity damping by sensitivity,
    // driven by actual fatigue (real streaks and hard work completed),
    // never by the size of the plan itself.
    const fatigue = fatigueIndicator(Object.values(state.tasks), topics, today);
    const damping =
      PLANNER_CONFIG.burnoutDamping[settings.burnoutSensitivity] ??
      PLANNER_CONFIG.burnoutDamping.medium;
    const loadFactor =
      fatigue.level === "high"
        ? damping.high
        : fatigue.level === "elevated"
          ? damping.elevated
          : 1;

    for (const task of generateSchedule({
      settings,
      topics,
      examDate: state.examDate,
      pinnedTasks: pinned,
      usedMinutesByDate,
      loadFactor,
      fromDate: today,
    })) {
      tasks[task.id] = task;
    }

    // Daily intelligence snapshot (idempotent per day) + retention prune.
    // The snapshot records the full display indicator (incl. planned load).
    const burnout = burnoutIndicator(
      Object.values(tasks),
      topics,
      settings,
      today,
    );
    const backlog = buildRevisionQueue(
      topics,
      today,
      new Set(),
      intervals.length,
    ).length;
    const cutoff = addDays(today, -PLANNER_CONFIG.snapshotRetentionDays);
    snapshots = Object.fromEntries(
      Object.entries(state.snapshots).filter(([date]) => date >= cutoff),
    );
    snapshots[today] = {
      burnoutScore: burnout.score,
      healthScore: studyHealth({
        tasks: Object.values(tasks),
        topics,
        settings,
        examDate: state.examDate,
        today,
      }).score,
      remainingMinutes: totalRemainingMinutes(topics),
      revisionBacklog: backlog,
    };
  }

  return { tasks, topics, lastPlannedAt: today, snapshots };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      setStage: (topicId, stage) =>
        set((state) => {
          const today = todayStr();
          const intervals = activeIntervals(state.planner);
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
                nextRevisionAt: nextRevisionDate(
                  stage,
                  revisionCount,
                  today,
                  intervals,
                ),
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
          const intervals = activeIntervals(state.planner);
          const topics = withTopic(state.topics, task.topicId, (current) => {
            const base = {
              ...current,
              completedSessions: current.completedSessions + 1,
            };
            if (task.kind === "revision") {
              // Climb the revision ladder and schedule the next one.
              const revisionCount = Math.min(
                current.revisionCount + 1,
                intervals.length,
              );
              const ladder: StudyStage[] = [
                "revision-1",
                "revision-2",
                "revision-3",
              ];
              const promoted = ladder[Math.min(revisionCount, 3) - 1];
              const stage =
                stageIndex(promoted) > stageIndex(current.stage)
                  ? promoted
                  : current.stage;
              return {
                ...base,
                revisionCount,
                stage,
                lastStudiedAt: today,
                nextRevisionAt: nextRevisionDate(
                  stage,
                  revisionCount,
                  today,
                  intervals,
                ),
              };
            }
            const studiedMinutes = current.studiedMinutes + task.minutes;
            const finished =
              current.stage === "not-started" &&
              studiedMinutes >= effectiveEstimate(task.topicId, current);
            const stage = finished ? "first-reading" : current.stage;
            return {
              ...base,
              studiedMinutes,
              lastStudiedAt: today,
              stage,
              // Finishing the first reading starts the revision clock.
              nextRevisionAt: finished
                ? nextRevisionDate(
                    stage,
                    current.revisionCount,
                    today,
                    intervals,
                  )
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
            // Skipping is avoidance — the topic's priority rises.
            topics: withTopic(state.topics, task.topicId, (current) => ({
              ...current,
              postponeCount: current.postponeCount + 1,
            })),
          };
        }),

      reopenTask: (taskId) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task || task.status === "pending" || task.status === "missed")
            return state;
          const intervals = activeIntervals(state.planner);
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
                  ? ladder[Math.min(revisionCount, 2)]
                  : current.stage;
              return {
                ...current,
                revisionCount,
                stage,
                completedSessions: Math.max(0, current.completedSessions - 1),
                nextRevisionAt: nextRevisionDate(
                  stage,
                  revisionCount,
                  todayStr(),
                  intervals,
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
              completedSessions: Math.max(0, current.completedSessions - 1),
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
          } else if (task.status === "skipped") {
            // Reopening a skip withdraws the postponement signal.
            topics = withTopic(state.topics, task.topicId, (current) => ({
              ...current,
              postponeCount: Math.max(0, current.postponeCount - 1),
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
          const postponed = date > task.date;
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
            // Pushing work later counts as a postponement signal.
            topics: postponed
              ? withTopic(state.topics, task.topicId, (current) => ({
                  ...current,
                  postponeCount: current.postponeCount + 1,
                }))
              : state.topics,
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
          snapshots: data.snapshots,
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
        if (version < 4) {
          state = {
            ...state,
            planner: state.planner ? withPlannerDefaults(state.planner) : null,
            snapshots: {},
          };
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
        snapshots: state.snapshots,
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
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    topics: state.topics,
    displayName: state.displayName,
    examDate: state.examDate,
    recentTopics: state.recentTopics,
    planner: state.planner,
    tasks: state.tasks,
    lastPlannedAt: state.lastPlannedAt,
    snapshots: state.snapshots,
    knowledge: exportKnowledge(),
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
      completedSessions: count(t.completedSessions),
      missedSessions: count(t.missedSessions),
      postponeCount: count(t.postponeCount),
    };
  }
  return topics;
}

function count(value: unknown): number {
  return typeof value === "number" && value >= 0 ? Math.round(value) : 0;
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
  const oneOf = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const d = PLANNER_SETTING_DEFAULTS;
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
    revisionIntervals:
      Array.isArray(p.revisionIntervals) &&
      p.revisionIntervals.length >= 1 &&
      p.revisionIntervals.length <= 6 &&
      p.revisionIntervals.every(
        (n) => typeof n === "number" && n >= 1 && n <= 180,
      )
        ? (p.revisionIntervals as number[]).map(Math.round)
        : [...d.revisionIntervals],
    maxHardPerDay: Math.min(6, Math.max(1, Math.round(num(p.maxHardPerDay, d.maxHardPerDay)))),
    morningDifficulty: oneOf(
      p.morningDifficulty,
      ["hard-first", "easy-first"],
      d.morningDifficulty,
    ),
    weekendStrategy: oneOf(
      p.weekendStrategy,
      ["normal", "light", "revision-heavy"],
      d.weekendStrategy,
    ),
    vacationFrom: isValidDateStr(p.vacationFrom) ? p.vacationFrom : null,
    vacationTo: isValidDateStr(p.vacationTo) ? p.vacationTo : null,
    aggressiveness: oneOf(
      p.aggressiveness,
      ["relaxed", "standard", "intense"],
      d.aggressiveness,
    ),
    burnoutSensitivity: oneOf(
      p.burnoutSensitivity,
      ["low", "medium", "high"],
      d.burnoutSensitivity,
    ),
  };
}

function sanitizeSnapshots(raw: unknown): Record<string, DailySnapshot> {
  const snapshots: Record<string, DailySnapshot> = {};
  if (typeof raw !== "object" || raw === null) return snapshots;
  for (const [date, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidDateStr(date) || typeof value !== "object" || value === null)
      continue;
    const s = value as Record<string, unknown>;
    if (typeof s.burnoutScore !== "number") continue;
    snapshots[date] = {
      burnoutScore: s.burnoutScore,
      healthScore: typeof s.healthScore === "number" ? s.healthScore : null,
      remainingMinutes:
        typeof s.remainingMinutes === "number" ? s.remainingMinutes : 0,
      revisionBacklog:
        typeof s.revisionBacklog === "number" ? s.revisionBacklog : 0,
    };
  }
  return snapshots;
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
  if (typeof obj.version !== "number" || obj.version > BACKUP_VERSION) {
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
      version: BACKUP_VERSION,
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
      snapshots: obj.version < 4 ? {} : sanitizeSnapshots(obj.snapshots),
      knowledge:
        obj.version < 5 || obj.knowledge == null
          ? null
          : sanitizeKnowledgeExport(obj.knowledge),
    },
  };
}

/** Convenience: tomorrow's date for "move to tomorrow" actions. */
export function tomorrowStr(): string {
  return addDays(todayStr(), 1);
}
