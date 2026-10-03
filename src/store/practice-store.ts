import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { makeId } from "@/lib/id";
import { getNode } from "@/lib/syllabus";
import { countWords, RUBRIC } from "@/lib/practice/answers";
import {
  ANSWER_MARKS,
  type AnswerAttempt,
  type AnswerDraft,
  type AnswerMarks,
  type RubricScore,
  type RubricScores,
  type SourceStatus,
  type ThinkerStatus,
} from "@/lib/practice/types";

/**
 * Practice store (`upsc-os-practice`): answer-writing attempts, the
 * autosaved in-progress draft, PSIR booklist progress and thinker mastery.
 * Kept separate from the planner and knowledge stores (same rule as the AI
 * store) so typing an answer never re-serialises planner state. Never
 * imports app-store; app-store embeds it in backups.
 */

export const PRACTICE_STORE_VERSION = 1;

/** Persisted practice data — also the backup-file section shape. */
export type PracticeExport = {
  answers: Record<string, AnswerAttempt>;
  sources: Record<string, SourceStatus>;
  thinkers: Record<string, ThinkerStatus>;
};

export type NewAnswerInput = {
  questionId: string | null;
  question: string;
  topicId: string | null;
  marks: AnswerMarks;
  answer: string;
  secondsSpent: number;
  timeLimitSeconds: number;
  rubric?: RubricScores;
};

type PracticeState = PracticeExport & {
  draft: AnswerDraft | null;

  saveAnswer: (input: NewAnswerInput) => string;
  setAnswerRubric: (id: string, rubric: RubricScores) => void;
  updateAnswerText: (id: string, answer: string) => void;
  setAnswerAiFeedback: (id: string, feedback: string | null) => void;
  deleteAnswer: (id: string) => void;

  setDraft: (draft: AnswerDraft | null) => void;

  setSourceStatus: (sourceId: string, status: SourceStatus | null) => void;
  setThinkerStatus: (thinkerId: string, status: ThinkerStatus | null) => void;

  importPractice: (data: PracticeExport) => void;
  resetPractice: () => void;
};

const initialData = (): PracticeExport & { draft: AnswerDraft | null } => ({
  answers: {},
  sources: {},
  thinkers: {},
  draft: null,
});

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set) => ({
      ...initialData(),

      saveAnswer: (input) => {
        const id = makeId("ans");
        const now = new Date().toISOString();
        const attempt: AnswerAttempt = {
          id,
          questionId: input.questionId,
          question: input.question.trim(),
          topicId: input.topicId && getNode(input.topicId) ? input.topicId : null,
          marks: input.marks,
          answer: input.answer,
          wordCount: countWords(input.answer),
          secondsSpent: Math.max(0, Math.round(input.secondsSpent)),
          timeLimitSeconds: Math.max(60, Math.round(input.timeLimitSeconds)),
          rubric: input.rubric ?? {},
          aiFeedback: null,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ answers: { ...state.answers, [id]: attempt } }));
        return id;
      },

      setAnswerRubric: (id, rubric) =>
        set((state) => {
          const current = state.answers[id];
          if (!current) return {};
          return {
            answers: {
              ...state.answers,
              [id]: { ...current, rubric, updatedAt: new Date().toISOString() },
            },
          };
        }),

      updateAnswerText: (id, answer) =>
        set((state) => {
          const current = state.answers[id];
          if (!current) return {};
          return {
            answers: {
              ...state.answers,
              [id]: {
                ...current,
                answer,
                wordCount: countWords(answer),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      setAnswerAiFeedback: (id, feedback) =>
        set((state) => {
          const current = state.answers[id];
          if (!current) return {};
          return {
            answers: {
              ...state.answers,
              [id]: {
                ...current,
                aiFeedback: feedback,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      deleteAnswer: (id) =>
        set((state) => ({ answers: withoutKey(state.answers, id) })),

      setDraft: (draft) => set({ draft }),

      setSourceStatus: (sourceId, status) =>
        set((state) => ({
          sources:
            status === null
              ? withoutKey(state.sources, sourceId)
              : { ...state.sources, [sourceId]: status },
        })),

      setThinkerStatus: (thinkerId, status) =>
        set((state) => ({
          thinkers:
            status === null
              ? withoutKey(state.thinkers, thinkerId)
              : { ...state.thinkers, [thinkerId]: status },
        })),

      importPractice: (data) =>
        set({
          answers: data.answers,
          sources: data.sources,
          thinkers: data.thinkers,
          draft: null,
        }),

      resetPractice: () => set(initialData()),
    }),
    {
      name: "upsc-os-practice",
      version: PRACTICE_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        answers: state.answers,
        sources: state.sources,
        thinkers: state.thinkers,
        draft: state.draft,
      }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Backup export / sanitization — drop-don't-throw, like every section. */
/* ------------------------------------------------------------------ */

export function exportPractice(): PracticeExport {
  const state = usePracticeStore.getState();
  return {
    answers: state.answers,
    sources: state.sources,
    thinkers: state.thinkers,
  };
}

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const nonNegative = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : fallback;

function sanitizeRubric(raw: unknown): RubricScores {
  const rubric: RubricScores = {};
  if (typeof raw !== "object" || raw === null) return rubric;
  const r = raw as Record<string, unknown>;
  for (const item of RUBRIC) {
    const value = r[item.key];
    if (value === 0 || value === 1 || value === 2) {
      rubric[item.key] = value as RubricScore;
    }
  }
  return rubric;
}

function sanitizeAnswers(raw: unknown): Record<string, AnswerAttempt> {
  const answers: Record<string, AnswerAttempt> = {};
  if (typeof raw !== "object" || raw === null) return answers;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const a = value as Record<string, unknown>;
    const question = str(a.question).trim();
    const answer = str(a.answer);
    if (question === "") continue;
    const marks = ANSWER_MARKS.includes(a.marks as AnswerMarks)
      ? (a.marks as AnswerMarks)
      : 10;
    const topicId =
      typeof a.topicId === "string" && getNode(a.topicId) ? a.topicId : null;
    const createdAt = str(a.createdAt, new Date(0).toISOString());
    answers[id] = {
      id,
      questionId: typeof a.questionId === "string" ? a.questionId : null,
      question,
      topicId,
      marks,
      answer,
      wordCount: countWords(answer),
      secondsSpent: nonNegative(a.secondsSpent, 0),
      timeLimitSeconds: Math.max(60, nonNegative(a.timeLimitSeconds, 420)),
      rubric: sanitizeRubric(a.rubric),
      aiFeedback: typeof a.aiFeedback === "string" ? a.aiFeedback : null,
      createdAt,
      updatedAt: str(a.updatedAt, createdAt),
    };
  }
  return answers;
}

function sanitizeStatusMap<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): Record<string, T> {
  const result: Record<string, T> = {};
  if (typeof raw !== "object" || raw === null) return result;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (allowed.includes(value as T)) result[key] = value as T;
  }
  return result;
}

export function sanitizePracticeExport(raw: unknown): PracticeExport {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    answers: sanitizeAnswers(r.answers),
    sources: sanitizeStatusMap(r.sources, ["reading", "done"] as const),
    thinkers: sanitizeStatusMap(r.thinkers, ["learning", "mastered"] as const),
  };
}
