"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PenLine } from "lucide-react";

import { getPracticeQuestion } from "@/lib/psir";
import { getNode } from "@/lib/syllabus";
import {
  estimateMarks,
  formatDuration,
  practiceStats,
  RUBRIC,
} from "@/lib/practice/answers";
import type { AnswerDraft } from "@/lib/practice/types";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionBank, type StartInput } from "@/components/practice/question-bank";
import { AnswerEditor } from "@/components/practice/answer-editor";
import { AnswerReview } from "@/components/practice/answer-review";
import { cn } from "@/lib/utils";

/**
 * Answer Writing: home (stats, question bank, history) → writing (timed
 * editor, autosaved draft) → review (rubric, estimate, AI review).
 * Deep links: ?q=<bank id> starts a question, ?topic=<id> filters the
 * bank, ?attempt=<id> opens a review.
 */
export function PracticeStudio() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useSearchParams();
  const draft = usePracticeStore((state) => state.draft);
  const setDraft = usePracticeStore((state) => state.setDraft);
  const answers = usePracticeStore((state) => state.answers);

  const attemptId = params.get("attempt");
  const requestedQuestion = params.get("q");
  const topicFilter = params.get("topic");

  const start = React.useCallback(
    (input: StartInput) => {
      const next: AnswerDraft = {
        ...input,
        answer: "",
        secondsSpent: 0,
        startedAt: new Date().toISOString(),
      };
      setDraft(next);
      router.replace("/practice");
      window.scrollTo({ top: 0 });
    },
    [router, setDraft],
  );

  // ?q= deep link starts that question (unless an answer is in progress).
  React.useEffect(() => {
    if (!mounted || !requestedQuestion) return;
    const question = getPracticeQuestion(requestedQuestion);
    if (!question) return;
    if (draft && draft.answer.trim() !== "" && draft.questionId !== question.id) return;
    if (draft?.questionId === question.id) {
      router.replace("/practice");
      return;
    }
    start({ questionId: question.id, question: question.text, topicId: question.topicId, marks: question.marks });
  }, [mounted, requestedQuestion, draft, start, router]);

  if (!mounted) return <Skeleton className="h-96 w-full" />;

  const attempt = attemptId ? answers[attemptId] : undefined;
  if (attempt) {
    return (
      <AnswerReview
        attempt={attempt}
        onBack={() => router.push("/practice")}
        onWriteAgain={() =>
          start({
            questionId: attempt.questionId,
            question: attempt.question,
            topicId: attempt.topicId,
            marks: attempt.marks,
          })
        }
      />
    );
  }

  if (draft) {
    const conflicting =
      requestedQuestion && draft.questionId !== requestedQuestion && draft.answer.trim() !== "";
    return (
      <div className="space-y-4">
        {conflicting && (
          <div className="callout text-sm">
            <span aria-hidden>📝</span>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <span>You have an unfinished answer. Finish or discard it first.</span>
              <Button size="sm" variant="ghost" onClick={() => router.replace("/practice")}>
                Keep writing
              </Button>
            </div>
          </div>
        )}
        <AnswerEditor
          key={draft.startedAt}
          draft={draft}
          onFinished={(id) => router.push(`/practice?attempt=${id}`)}
          onDiscard={() => setDraft(null)}
        />
      </div>
    );
  }

  return <PracticeHome topicFilter={topicFilter} onStart={start} />;
}

function PracticeHome({
  topicFilter,
  onStart,
}: {
  topicFilter: string | null;
  onStart: (input: StartInput) => void;
}) {
  const router = useRouter();
  const answers = usePracticeStore((state) => state.answers);
  const attempts = React.useMemo(
    () => Object.values(answers).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [answers],
  );
  const stats = practiceStats(attempts);
  const focus = stats.focusCriterion
    ? RUBRIC.find((item) => item.key === stats.focusCriterion)?.label
    : null;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Answers written" value={String(stats.total)} detail={`${stats.thisWeek} this week`} />
        <Stat
          label="Writing streak"
          value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
          detail={stats.streak > 0 ? "keep it alive today" : "write one today"}
        />
        <Stat
          label="Avg. self-score"
          value={stats.averagePercent === null ? "—" : `${stats.averagePercent}%`}
          detail={focus ? `work on: ${focus.toLowerCase()}` : "score answers to see trends"}
        />
        <Stat
          label="On time"
          value={stats.onTimePercent === null ? "—" : `${stats.onTimePercent}%`}
          detail="within the exam time budget"
        />
      </section>

      {topicFilter && getNode(topicFilter) && (
        <p className="callout text-sm">
          <span aria-hidden>🔎</span>
          <span>
            Showing questions for <span className="font-medium">{getNode(topicFilter)!.title}</span>.
          </span>
        </p>
      )}

      <QuestionBank initialTopic={topicFilter} onStart={onStart} />

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">History</h2>
        {attempts.length === 0 ? (
          <p className="callout text-sm">
            <span aria-hidden>✍️</span>
            <span>
              Your timed answers will appear here with words, time and score.
              Two answers a day is the single highest-return PSIR habit.
            </span>
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-[13px] text-muted-foreground">
                  <th className="w-28 py-2 pr-3 font-normal">Date</th>
                  <th className="border-l px-3 py-2 font-normal">
                    <span className="font-serif italic">Aa</span> Question
                  </th>
                  <th className="w-16 border-l px-3 py-2 font-normal">Marks</th>
                  <th className="w-20 border-l px-3 py-2 font-normal">Words</th>
                  <th className="w-20 border-l px-3 py-2 font-normal">Time</th>
                  <th className="w-24 border-l px-3 py-2 font-normal">Est. score</th>
                  <th className="w-14 border-l px-3 py-2 font-normal">AI</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 50).map((attempt) => {
                  const estimate = estimateMarks(attempt.marks, attempt.rubric);
                  const overTime = attempt.secondsSpent > attempt.timeLimitSeconds;
                  return (
                    <tr
                      key={attempt.id}
                      onClick={() => router.push(`/practice?attempt=${attempt.id}`)}
                      className="cursor-pointer border-b hover:bg-secondary/40"
                    >
                      <td className="py-2 pr-3 text-muted-foreground">
                        {new Date(attempt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td className="border-l px-3 py-2">
                        <span className="line-clamp-1 font-medium">{attempt.question}</span>
                      </td>
                      <td className="border-l px-3 py-2 tabular-nums">{attempt.marks}</td>
                      <td className="border-l px-3 py-2 tabular-nums">{attempt.wordCount}</td>
                      <td className={cn("border-l px-3 py-2 tabular-nums", overTime && "text-destructive")}>
                        {formatDuration(attempt.secondsSpent)}
                      </td>
                      <td className="border-l px-3 py-2 tabular-nums">
                        {estimate === null ? (
                          <span className="tag tag-gray">Score it</span>
                        ) : (
                          `${estimate}/${attempt.marks}`
                        )}
                      </td>
                      <td className="border-l px-3 py-2">{attempt.aiFeedback ? "✓" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <PenLine /> Pick another question
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
