/**
 * Shapes for the PSIR optional reference library. Everything here is
 * static, curated data shipped with the app (no user data) — user progress
 * on top of it lives in the practice store.
 */

export type PsirPaperId = "mains.psir1" | "mains.psir2";

export type ThinkerCategory =
  | "western"
  | "indian"
  | "theory"
  | "indian-politics"
  | "comparative-ir";

export type Thinker = {
  /** Stable slug (used in URLs/anchors). */
  id: string;
  name: string;
  /** Lifespan or key-work date — kept factual and short. */
  period: string;
  /** School / tradition, e.g. "Liberal contractarian". */
  school: string;
  category: ThinkerCategory;
  /** True when UPSC names this thinker in the PSIR syllabus itself. */
  inSyllabus: boolean;
  works: string[];
  ideas: string[];
  /** Well-known lines worth quoting in answers. */
  quotes: string[];
  /** Standard criticisms — the raw material for "critically examine". */
  critiques: string[];
  /** Syllabus leaf topics where this thinker earns marks. */
  topicIds: string[];
  /** One practical line on how to use them in an answer. */
  tip: string;
};

export type PracticeQuestion = {
  id: string;
  /** Syllabus leaf topic this question practises. */
  topicId: string;
  marks: 10 | 15 | 20;
  text: string;
};

export type SourceTier = "foundation" | "core" | "supplementary" | "current";

export type StudySource = {
  id: string;
  title: string;
  author: string;
  tier: SourceTier;
  /** Unit (or paper) ids this source covers. */
  coversIds: string[];
  /** Why/how to use it — one line. */
  note: string;
};

export type SynergyLink = {
  /** A PSIR unit id. */
  psirId: string;
  /** GS / Essay / Prelims node ids that the PSIR unit also prepares. */
  targets: string[];
  note: string;
};
