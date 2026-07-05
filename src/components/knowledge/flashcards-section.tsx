"use client";

import * as React from "react";
import { Check, Play, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DIFFICULTY_META, type Difficulty } from "@/lib/stages";
import { isFlashcardDue, reviewQueue } from "@/lib/knowledge/insights";
import type { Flashcard } from "@/lib/knowledge/types";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FlashcardsSection({ topicId }: { topicId: string }) {
  const flashcards = useKnowledgeStore((state) => state.flashcards);
  const addFlashcard = useKnowledgeStore((state) => state.addFlashcard);
  const removeFlashcard = useKnowledgeStore((state) => state.removeFlashcard);

  const [front, setFront] = React.useState("");
  const [back, setBack] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("medium");
  const [tags, setTags] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);

  const cards = React.useMemo(
    () =>
      Object.values(flashcards)
        .filter((card) => card.topicId === topicId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [flashcards, topicId],
  );
  const dueCount = cards.filter((card) => isFlashcardDue(card)).length;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (front.trim() === "" || back.trim() === "") return;
    addFlashcard(topicId, {
      front: front.trim(),
      back: back.trim(),
      difficulty,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setFront("");
    setBack("");
    setTags("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2 rounded-lg border bg-secondary/20 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="Front — the question or cue"
          />
          <Input
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder="Back — the answer"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label="Card difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            className="w-28"
          >
            {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </NativeSelect>
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags (comma-separated)"
            className="min-w-40 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={front.trim() === "" || back.trim() === ""}
          >
            <Plus /> Add card
          </Button>
        </div>
      </form>

      {cards.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {cards.length} card{cards.length === 1 ? "" : "s"}
            {dueCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}
                · {dueCount} due for review
              </span>
            )}
          </p>
          <Button size="sm" variant="outline" onClick={() => setReviewing(true)}>
            <Play /> Review cards
          </Button>
        </div>
      )}

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Facts, articles, dates, definitions — anything worth recalling under
          exam pressure.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  isFlashcardDue(card)
                    ? "bg-amber-500"
                    : "bg-muted-foreground/30",
                )}
                title={isFlashcardDue(card) ? "Due for review" : "Reviewed recently"}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{card.front}</p>
                <p className="text-muted-foreground">{card.back}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {DIFFICULTY_META[card.difficulty].label}
                  {card.reviewCount > 0 &&
                    ` · ${card.reviewCount} review${card.reviewCount === 1 ? "" : "s"}`}
                  {card.correctStreak > 1 && ` · ${card.correctStreak}✓ streak`}
                  {card.tags.length > 0 && ` · ${card.tags.join(", ")}`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete flashcard"
                onClick={() => removeFlashcard(card.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {reviewing && (
        <ReviewDialog topicId={topicId} onClose={() => setReviewing(false)} />
      )}
    </div>
  );
}

/** Flip-through review: front → reveal → correct/wrong, due cards first. */
function ReviewDialog({
  topicId,
  onClose,
}: {
  topicId: string;
  onClose: () => void;
}) {
  const flashcards = useKnowledgeStore((state) => state.flashcards);
  const reviewFlashcard = useKnowledgeStore((state) => state.reviewFlashcard);

  // The queue is fixed at open so answered cards don't reshuffle mid-run.
  const [queue] = React.useState<Flashcard[]>(() =>
    reviewQueue(useKnowledgeStore.getState().flashcards, topicId),
  );
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [results, setResults] = React.useState({ correct: 0, wrong: 0 });

  const card = queue[index] ? flashcards[queue[index].id] : undefined;
  const finished = index >= queue.length;

  const answer = (correct: boolean) => {
    if (!card) return;
    reviewFlashcard(card.id, correct);
    setResults((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      wrong: current.wrong + (correct ? 0 : 1),
    }));
    setRevealed(false);
    setIndex((current) => current + 1);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {finished
              ? "Review complete"
              : `Card ${index + 1} of ${queue.length}`}
          </DialogTitle>
          <DialogDescription>
            {finished
              ? `${results.correct} correct · ${results.wrong} to revisit`
              : "Recall the answer, then reveal and be honest."}
          </DialogDescription>
        </DialogHeader>

        {!finished && card && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-sm font-medium">{card.front}</p>
              {revealed && (
                <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                  {card.back}
                </p>
              )}
            </div>
            {!revealed ? (
              <Button className="w-full" onClick={() => setRevealed(true)}>
                Reveal answer
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => answer(false)}>
                  <X /> Got it wrong
                </Button>
                <Button onClick={() => answer(true)}>
                  <Check /> Got it right
                </Button>
              </div>
            )}
          </div>
        )}

        {finished && (
          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
