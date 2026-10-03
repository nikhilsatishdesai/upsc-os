"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PenLine, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { answerFormat } from "@/data/psir/exam";
import { getNode } from "@/lib/syllabus";
import {
  estimateMarks,
  formatDuration,
  RUBRIC,
  rubricPercent,
  weakestCriteria,
} from "@/lib/practice/answers";
import type { AnswerAttempt, RubricScore } from "@/lib/practice/types";
import { usePracticeStore } from "@/store/practice-store";
import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useAiService } from "@/components/ai/use-ai-service";
import { friendlyAiError } from "@/components/ai/ai-error";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCORE_LABEL: Record<RubricScore, string> = { 0: "Missing", 1: "Partly", 2: "Done well" };

/** Post-answer review: self-evaluation rubric, realistic marks estimate,
 * and an optional examiner-style AI review grounded in the topic notes. */
export function AnswerReview({
  attempt,
  onBack,
  onWriteAgain,
}: {
  attempt: AnswerAttempt;
  onBack: () => void;
  onWriteAgain: () => void;
}) {
  const setRubric = usePracticeStore((state) => state.setAnswerRubric);
  const setFeedback = usePracticeStore((state) => state.setAnswerAiFeedback);
  const deleteAnswer = usePracticeStore((state) => state.deleteAnswer);
  const configured = useAiStore((state) => aiConfigured(state.providers));
  const service = useAiService();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const format = answerFormat(attempt.marks);
  const percent = rubricPercent(attempt.rubric);
  const estimate = estimateMarks(attempt.marks, attempt.rubric);
  const weakest = weakestCriteria(attempt.rubric).slice(0, 2);
  const topic = attempt.topicId ? getNode(attempt.topicId) : null;
  const overTime = attempt.secondsSpent > attempt.timeLimitSeconds;
  const wordDelta = attempt.wordCount - format.words;

  const score = (key: (typeof RUBRIC)[number]["key"], value: RubricScore) =>
    setRubric(attempt.id, { ...attempt.rubric, [key]: value });

  const review = async () => {
    setBusy(true);
    setError(null);
    try {
      const text = await service.evaluateAnswer({
        question: attempt.question,
        marks: attempt.marks,
        answer: attempt.answer,
        topicId: attempt.topicId,
        secondsSpent: attempt.secondsSpent,
        timeLimitSeconds: attempt.timeLimitSeconds,
      });
      setFeedback(attempt.id, text);
    } catch (caught) {
      setError(friendlyAiError(caught) || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All practice
      </button>

      <div className="callout">
        <span aria-hidden className="text-lg leading-6">❓</span>
        <div className="min-w-0 space-y-2">
          <p className="text-[15px] font-medium leading-relaxed">{attempt.question}</p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="tag tag-gray font-semibold">{attempt.marks} marks</span>
            <span className={cn("tag", Math.abs(wordDelta) <= format.words * 0.15 ? "tag-green" : "tag-orange")}>
              {attempt.wordCount} words (target {format.words})
            </span>
            <span className={cn("tag", overTime ? "tag-red" : "tag-green")}>
              {formatDuration(attempt.secondsSpent)} of {format.minutes}:00
            </span>
            {topic && attempt.topicId && (
              <Link href={`/syllabus/${attempt.topicId}`} className="tag tag-purple max-w-full hover:opacity-80">
                <span className="truncate">{topic.title}</span>
              </Link>
            )}
            <span className="text-muted-foreground">
              {new Date(attempt.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <section className="min-w-0 space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Your answer</h2>
          <div className="whitespace-pre-wrap rounded-lg border bg-background px-4 py-3 text-[15px] leading-7">
            {attempt.answer || <span className="text-muted-foreground">(blank)</span>}
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Self-evaluation</h2>
            {percent !== null && (
              <span className="text-sm text-muted-foreground">
                Rubric {percent}% · est.{" "}
                <span className="font-semibold text-foreground">
                  {estimate}/{attempt.marks}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Mark each criterion honestly. The estimate maps your rubric onto a
            realistic 20–65% band — optional answers rarely score higher.
          </p>
          <div className="divide-y rounded-lg border">
            {RUBRIC.map((item) => {
              const value = attempt.rubric[item.key];
              return (
                <div key={item.key} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <div className="flex shrink-0 overflow-hidden rounded-md border text-xs" role="radiogroup" aria-label={item.label}>
                    {([0, 1, 2] as RubricScore[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={value === option}
                        onClick={() => score(item.key, option)}
                        className={cn(
                          "px-2.5 py-1 transition-colors",
                          option > 0 && "border-l",
                          value === option
                            ? option === 2
                              ? "tag-green"
                              : option === 1
                                ? "tag-yellow"
                                : "tag-red"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {SCORE_LABEL[option]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {weakest.length > 0 && percent !== null && (
            <div className="callout text-sm">
              <span aria-hidden>🎯</span>
              <p>
                Next answer, fix:{" "}
                <span className="font-medium">
                  {weakest.map((key) => RUBRIC.find((item) => item.key === key)?.label).join(" and ")}
                </span>
                .
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">🧠 Chanakya&apos;s examiner review</h2>
          {configured && (
            <Button size="sm" variant={attempt.aiFeedback ? "ghost" : "default"} onClick={review} disabled={busy}>
              {attempt.aiFeedback ? <RefreshCw /> : <Sparkles />}
              {busy ? "Reviewing…" : attempt.aiFeedback ? "Review again" : "Get review"}
            </Button>
          )}
        </div>
        {!configured ? (
          <p className="callout text-sm">
            <span aria-hidden>🔑</span>
            <span>
              Connect an AI provider in{" "}
              <Link href="/settings" className="underline">
                Settings → AI
              </Link>{" "}
              for a strict, examiner-style score, gap analysis, a better
              introduction and conclusion, and a model skeleton — grounded in
              your own notes for this topic.
            </span>
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : attempt.aiFeedback ? (
          <div className="rounded-lg border px-4 py-3">
            <AiMarkdown content={attempt.aiFeedback} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Get a realistic score, what worked, the gaps, what to add, and a
            model answer skeleton.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button onClick={onWriteAgain}>
          <PenLine /> Write it again
        </Button>
        <Button variant="outline" onClick={onBack}>
          Practise another
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-muted-foreground"
          onClick={() => {
            if (window.confirm("Delete this attempt?")) {
              deleteAnswer(attempt.id);
              onBack();
            }
          }}
        >
          <Trash2 /> Delete
        </Button>
      </div>
    </div>
  );
}
