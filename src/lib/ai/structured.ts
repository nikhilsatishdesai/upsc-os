/**
 * Structured-output parsing for JSON-mode features. Strict validation
 * with drop-don't-throw semantics (same philosophy as the backup
 * sanitizers): malformed entries disappear, valid ones survive.
 */

/** Parse model output that should be JSON — tolerates code fences and
 * leading/trailing prose around a single JSON object. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced ? fenced[1] : trimmed];
  if (!fenced) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export type FlashcardDraft = { front: string; back: string };

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Validate drafted flashcards and drop near-duplicates of existing cards
 * (normalized front match) and of each other.
 */
export function parseFlashcardDrafts(
  text: string,
  existingFronts: string[],
): FlashcardDraft[] {
  const parsed = parseJsonLoose(text) as { cards?: unknown } | unknown[] | null;
  const rawCards = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray((parsed as { cards?: unknown[] }).cards)
      ? ((parsed as { cards: unknown[] }).cards)
      : [];
  const seen = new Set(existingFronts.map(normalize));
  const drafts: FlashcardDraft[] = [];
  for (const raw of rawCards) {
    if (typeof raw !== "object" || raw === null) continue;
    const card = raw as Record<string, unknown>;
    if (typeof card.front !== "string" || typeof card.back !== "string") continue;
    const front = card.front.trim();
    const back = card.back.trim();
    if (front === "" || back === "" || front.length > 500 || back.length > 1000)
      continue;
    const key = normalize(front);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    drafts.push({ front, back });
  }
  return drafts;
}

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

/** Validate a generated quiz; returns [] when nothing usable survives
 * (the service then runs its one repair retry). */
export function parseQuiz(text: string): QuizQuestion[] {
  const parsed = parseJsonLoose(text) as { questions?: unknown } | null;
  const rawQuestions =
    parsed && Array.isArray((parsed as { questions?: unknown[] }).questions)
      ? ((parsed as { questions: unknown[] }).questions)
      : [];
  const questions: QuizQuestion[] = [];
  for (const raw of rawQuestions) {
    if (typeof raw !== "object" || raw === null) continue;
    const q = raw as Record<string, unknown>;
    if (
      typeof q.question !== "string" ||
      q.question.trim() === "" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !q.options.every(
        (option) => typeof option === "string" && option.trim() !== "",
      ) ||
      typeof q.answerIndex !== "number" ||
      !Number.isInteger(q.answerIndex) ||
      q.answerIndex < 0 ||
      q.answerIndex > 3
    )
      continue;
    questions.push({
      question: q.question.trim(),
      options: (q.options as string[]).map((option) => option.trim()),
      answerIndex: q.answerIndex,
      explanation:
        typeof q.explanation === "string" ? q.explanation.trim() : "",
    });
  }
  return questions;
}
