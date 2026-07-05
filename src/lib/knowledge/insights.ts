import { KNOWLEDGE_CONFIG } from "./config";
import type { Flashcard } from "./types";

/** A card is due when never reviewed or unreviewed for the config window. */
export function isFlashcardDue(
  card: Flashcard,
  now: Date = new Date(),
): boolean {
  if (card.lastReviewedAt === null) return true;
  const ageDays =
    (now.getTime() - new Date(card.lastReviewedAt).getTime()) / 86_400_000;
  return ageDays >= KNOWLEDGE_CONFIG.flashcardDueAfterDays;
}

/** Cards to review (optionally for one topic), most-stale first. */
export function dueFlashcards(
  cards: Record<string, Flashcard>,
  topicId?: string,
  now: Date = new Date(),
): Flashcard[] {
  return Object.values(cards)
    .filter(
      (card) =>
        (topicId === undefined || card.topicId === topicId) &&
        isFlashcardDue(card, now),
    )
    .sort((a, b) =>
      (a.lastReviewedAt ?? "").localeCompare(b.lastReviewedAt ?? ""),
    );
}

/** Review order for a topic: due cards first, then the rest, stalest first. */
export function reviewQueue(
  cards: Record<string, Flashcard>,
  topicId: string,
  now: Date = new Date(),
): Flashcard[] {
  const topicCards = Object.values(cards).filter(
    (card) => card.topicId === topicId,
  );
  return topicCards.sort((a, b) => {
    const dueA = isFlashcardDue(a, now) ? 0 : 1;
    const dueB = isFlashcardDue(b, now) ? 0 : 1;
    return (
      dueA - dueB ||
      (a.lastReviewedAt ?? "").localeCompare(b.lastReviewedAt ?? "")
    );
  });
}
