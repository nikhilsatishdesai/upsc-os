import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { getNode } from "@/lib/syllabus";
import { isTopicStatus, type TopicStatus } from "@/lib/status";
import type { ProgressMap } from "@/lib/progress";

export const STORE_VERSION = 1;
const MAX_RECENT = 8;

type AppState = {
  /** Leaf-topic statuses. "not-started" entries are removed, not stored. */
  progress: ProgressMap;
  displayName: string;
  /** Target exam date as YYYY-MM-DD ("" = not set). */
  examDate: string;
  /** Most recently viewed topic IDs, newest first. */
  recentTopics: string[];

  setStatus: (topicId: string, status: TopicStatus) => void;
  setDisplayName: (name: string) => void;
  setExamDate: (date: string) => void;
  touchRecent: (topicId: string) => void;
  importState: (data: ExportedState) => void;
  resetAll: () => void;
};

export type ExportedState = {
  app: "upsc-os";
  version: number;
  exportedAt: string;
  progress: ProgressMap;
  displayName: string;
  examDate: string;
  recentTopics: string[];
};

const initialData = {
  progress: {} as ProgressMap,
  displayName: "",
  examDate: "",
  recentTopics: [] as string[],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      setStatus: (topicId, status) =>
        set((state) => {
          const progress = { ...state.progress };
          if (status === "not-started") {
            delete progress[topicId];
          } else {
            progress[topicId] = status;
          }
          return { progress };
        }),

      setDisplayName: (displayName) => set({ displayName }),

      setExamDate: (examDate) => set({ examDate }),

      touchRecent: (topicId) =>
        set((state) => ({
          recentTopics: [
            topicId,
            ...state.recentTopics.filter((id) => id !== topicId),
          ].slice(0, MAX_RECENT),
        })),

      importState: (data) =>
        set({
          progress: data.progress,
          displayName: data.displayName,
          examDate: data.examDate,
          recentTopics: data.recentTopics,
        }),

      resetAll: () => set({ ...initialData }),
    }),
    {
      name: "upsc-os-store",
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        progress: state.progress,
        displayName: state.displayName,
        examDate: state.examDate,
        recentTopics: state.recentTopics,
      }),
    },
  ),
);

/** Serialize the user's data for a downloadable JSON backup. */
export function exportStateToJSON(): string {
  const { progress, displayName, examDate, recentTopics } =
    useAppStore.getState();
  const data: ExportedState = {
    app: "upsc-os",
    version: STORE_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    displayName,
    examDate,
    recentTopics,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Validate a backup file's contents. Returns the parsed state or an error
 * message describing what is wrong (never throws).
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
  const progress: ProgressMap = {};
  if (typeof obj.progress === "object" && obj.progress !== null) {
    for (const [key, value] of Object.entries(
      obj.progress as Record<string, unknown>,
    )) {
      // Silently drop unknown topics/statuses so old backups stay importable.
      if (getNode(key) && isTopicStatus(value) && value !== "not-started") {
        progress[key] = value;
      }
    }
  }
  const recentTopics = Array.isArray(obj.recentTopics)
    ? obj.recentTopics
        .filter((id): id is string => typeof id === "string" && !!getNode(id))
        .slice(0, MAX_RECENT)
    : [];

  return {
    ok: true,
    data: {
      app: "upsc-os",
      version: STORE_VERSION,
      exportedAt:
        typeof obj.exportedAt === "string"
          ? obj.exportedAt
          : new Date().toISOString(),
      progress,
      displayName: typeof obj.displayName === "string" ? obj.displayName : "",
      examDate:
        typeof obj.examDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(obj.examDate)
          ? obj.examDate
          : "",
      recentTopics,
    },
  };
}
