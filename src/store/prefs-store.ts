import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { getNode } from "@/lib/syllabus";
import { isValidDateStr } from "@/lib/planner/dates";
import { EMPTY_TARGETS, type Targets } from "@/lib/targets";

/**
 * Personal preferences (`upsc-os-prefs`): the "about me" layer that makes
 * the OS personal — target attempt, optional subject, personal targets and
 * dashboard layout. Separate store, embedded in backups by app-store.
 */

export const PREFS_STORE_VERSION = 1;

export type OptionalSubject = "psir" | "other";

export const DASHBOARD_CARDS = [
  { id: "quick-actions", label: "Quick actions" },
  { id: "targets", label: "My targets" },
  { id: "briefing", label: "Daily AI briefing" },
  { id: "today", label: "Today's plan" },
  { id: "insights", label: "Insights & recommendations" },
  { id: "psir", label: "PSIR optional" },
  { id: "papers", label: "Progress by paper" },
  { id: "activity", label: "Recent activity" },
  { id: "knowledge", label: "Knowledge base" },
  { id: "recent", label: "Continue where you left off" },
] as const;

export type DashboardCardId = (typeof DASHBOARD_CARDS)[number]["id"];

export type PrefsExport = {
  attemptYear: number | null;
  optionalSubject: OptionalSubject;
  targets: Targets;
  hiddenCards: DashboardCardId[];
  onboardingDismissed: boolean;
};

type PrefsState = PrefsExport & {
  setAttemptYear: (year: number | null) => void;
  setOptionalSubject: (subject: OptionalSubject) => void;
  setTargets: (patch: Partial<Targets>) => void;
  setPaperDeadline: (paperId: string, date: string | null) => void;
  setCardHidden: (id: DashboardCardId, hidden: boolean) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
  importPrefs: (data: PrefsExport) => void;
  resetPrefs: () => void;
};

const initialData = (): PrefsExport => ({
  attemptYear: null,
  optionalSubject: "psir",
  targets: { ...EMPTY_TARGETS, paperDeadlines: {} },
  hiddenCards: [],
  onboardingDismissed: false,
});

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      ...initialData(),

      setAttemptYear: (attemptYear) => set({ attemptYear }),
      setOptionalSubject: (optionalSubject) => set({ optionalSubject }),
      setTargets: (patch) =>
        set((state) => ({ targets: { ...state.targets, ...patch } })),
      setPaperDeadline: (paperId, date) =>
        set((state) => {
          const paperDeadlines = { ...state.targets.paperDeadlines };
          if (date === null) delete paperDeadlines[paperId];
          else paperDeadlines[paperId] = date;
          return { targets: { ...state.targets, paperDeadlines } };
        }),
      setCardHidden: (id, hidden) =>
        set((state) => ({
          hiddenCards: hidden
            ? [...new Set([...state.hiddenCards, id])]
            : state.hiddenCards.filter((card) => card !== id),
        })),
      setOnboardingDismissed: (onboardingDismissed) => set({ onboardingDismissed }),
      importPrefs: (data) => set({ ...data }),
      resetPrefs: () => set(initialData()),
    }),
    {
      name: "upsc-os-prefs",
      version: PREFS_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PrefsExport => ({
        attemptYear: state.attemptYear,
        optionalSubject: state.optionalSubject,
        targets: state.targets,
        hiddenCards: state.hiddenCards,
        onboardingDismissed: state.onboardingDismissed,
      }),
    },
  ),
);

export function exportPrefs(): PrefsExport {
  const state = usePrefsStore.getState();
  return {
    attemptYear: state.attemptYear,
    optionalSubject: state.optionalSubject,
    targets: state.targets,
    hiddenCards: state.hiddenCards,
    onboardingDismissed: state.onboardingDismissed,
  };
}

const positiveOrNull = (value: unknown, max: number): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(max, Math.round(value))
    : null;

/** Validate a backup's prefs section — drop-don't-throw. */
export function sanitizePrefsExport(raw: unknown): PrefsExport {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const t = (typeof r.targets === "object" && r.targets !== null
    ? r.targets
    : {}) as Record<string, unknown>;
  const deadlines: Record<string, string> = {};
  if (typeof t.paperDeadlines === "object" && t.paperDeadlines !== null) {
    for (const [id, date] of Object.entries(t.paperDeadlines as Record<string, unknown>)) {
      if (id.split(".").length === 2 && getNode(id) && isValidDateStr(date)) {
        deadlines[id] = date;
      }
    }
  }
  const validCards = new Set<string>(DASHBOARD_CARDS.map((card) => card.id));
  return {
    attemptYear:
      typeof r.attemptYear === "number" && r.attemptYear >= 2020 && r.attemptYear <= 2100
        ? Math.round(r.attemptYear)
        : null,
    optionalSubject: r.optionalSubject === "other" ? "other" : "psir",
    targets: {
      studyHours: positiveOrNull(t.studyHours, 100),
      sessions: positiveOrNull(t.sessions, 60),
      answers: positiveOrNull(t.answers, 50),
      flashcardReviews: positiveOrNull(t.flashcardReviews, 1000),
      paperDeadlines: deadlines,
    },
    hiddenCards: Array.isArray(r.hiddenCards)
      ? (r.hiddenCards.filter(
          (id): id is DashboardCardId => typeof id === "string" && validCards.has(id),
        ) as DashboardCardId[])
      : [],
    onboardingDismissed: r.onboardingDismissed === true,
  };
}
