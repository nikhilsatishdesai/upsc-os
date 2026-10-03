/**
 * Answer-writing practice entities. Attempts are self-contained (they keep
 * the question text) so a bank question can change without orphaning the
 * user's history.
 */

export type AnswerMarks = 10 | 15 | 20;

export const ANSWER_MARKS: AnswerMarks[] = [10, 15, 20];

export type RubricKey =
  | "demand"
  | "intro"
  | "theory"
  | "perspectives"
  | "evidence"
  | "structure"
  | "conclusion";

/** 0 = missing, 1 = partly there, 2 = done well. */
export type RubricScore = 0 | 1 | 2;

export type RubricScores = Partial<Record<RubricKey, RubricScore>>;

export type AnswerAttempt = {
  id: string;
  /** Bank question id, or null for a custom question. */
  questionId: string | null;
  question: string;
  /** Syllabus leaf topic the answer practises (null if unlinked). */
  topicId: string | null;
  marks: AnswerMarks;
  answer: string;
  wordCount: number;
  secondsSpent: number;
  timeLimitSeconds: number;
  rubric: RubricScores;
  /** Written only via the AI evaluation feature. */
  aiFeedback: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The in-progress answer, autosaved so a refresh never loses work. */
export type AnswerDraft = {
  questionId: string | null;
  question: string;
  topicId: string | null;
  marks: AnswerMarks;
  answer: string;
  secondsSpent: number;
  startedAt: string;
};

export type SourceStatus = "reading" | "done";
export type ThinkerStatus = "learning" | "mastered";
