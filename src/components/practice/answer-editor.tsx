"use client";

import * as React from "react";
import { Check, Pause, Play, Trash2 } from "lucide-react";

import { answerFormat, ANSWER_FRAMEWORK } from "@/data/psir/exam";
import { getNode } from "@/lib/syllabus";
import { thinkersForTopic } from "@/lib/psir";
import { countWords, formatDuration } from "@/lib/practice/answers";
import type { AnswerDraft } from "@/lib/practice/types";
import { usePracticeStore } from "@/store/practice-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Exam-conditions writing: a pausable countdown sized to the marks, a live
 * word meter against the target, and the draft autosaved continuously so a
 * refresh never loses an answer.
 */
export function AnswerEditor({
  draft,
  onFinished,
  onDiscard,
}: {
  draft: AnswerDraft;
  onFinished: (attemptId: string) => void;
  onDiscard: () => void;
}) {
  const setDraft = usePracticeStore((state) => state.setDraft);
  const saveAnswer = usePracticeStore((state) => state.saveAnswer);
  const format = answerFormat(draft.marks);
  const limitSeconds = format.minutes * 60;

  const [text, setText] = React.useState(draft.answer);
  const [banked, setBanked] = React.useState(draft.secondsSpent);
  const [runningSince, setRunningSince] = React.useState<number | null>(() => Date.now());
  const [now, setNow] = React.useState(() => Date.now());

  const elapsed =
    banked + (runningSince === null ? 0 : Math.floor((now - runningSince) / 1000));

  React.useEffect(() => {
    if (runningSince === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [runningSince]);

  // Debounced autosave of text + time into the persisted draft. `closed`
  // stops late saves from resurrecting a draft after Finish/Discard.
  const latest = React.useRef({ text, elapsed });
  React.useEffect(() => {
    latest.current = { text, elapsed };
  });
  const closed = React.useRef(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      if (closed.current) return;
      setDraft({ ...draft, answer: text, secondsSpent: latest.current.elapsed });
    }, 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  // Bank time on unmount (navigating away keeps the draft resumable).
  React.useEffect(
    () => () => {
      if (closed.current) return;
      setDraft({
        ...draft,
        answer: latest.current.text,
        secondsSpent: latest.current.elapsed,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pause = () => {
    setBanked(elapsed);
    setRunningSince(null);
    setDraft({ ...draft, answer: text, secondsSpent: elapsed });
  };
  const resume = () => {
    setNow(Date.now());
    setRunningSince(Date.now());
  };

  const finish = () => {
    closed.current = true;
    const id = saveAnswer({
      questionId: draft.questionId,
      question: draft.question,
      topicId: draft.topicId,
      marks: draft.marks,
      answer: text,
      secondsSpent: elapsed,
      timeLimitSeconds: limitSeconds,
    });
    setDraft(null);
    onFinished(id);
  };

  const words = countWords(text);
  const remaining = limitSeconds - elapsed;
  const overTime = remaining < 0;
  const wordRatio = words / format.words;
  const topic = draft.topicId ? getNode(draft.topicId) : null;
  const thinkers = draft.topicId ? thinkersForTopic(draft.topicId).slice(0, 5) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-4">
        <div className="callout">
          <span aria-hidden className="text-lg leading-6">❓</span>
          <div className="min-w-0 space-y-2">
            <p className="text-[15px] font-medium leading-relaxed">{draft.question}</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="tag tag-gray font-semibold">{draft.marks} marks</span>
              <span className="tag tag-blue">≈ {format.words} words</span>
              <span className="tag tag-yellow">{format.minutes} min</span>
              {topic && <span className="tag tag-purple max-w-full"><span className="truncate">{topic.title}</span></span>}
            </div>
          </div>
        </div>

        {/* Timer + word meter */}
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 px-3 py-2 backdrop-blur md:top-12">
          <span
            className={cn(
              "font-mono text-xl font-semibold tabular-nums",
              overTime ? "text-destructive" : remaining < 60 ? "text-amber-600 dark:text-amber-400" : "",
            )}
            aria-live="off"
          >
            {overTime ? "+" : ""}
            {formatDuration(Math.abs(remaining))}
          </span>
          <span className="text-xs text-muted-foreground">
            {overTime ? "over time" : runningSince === null ? "paused" : "left"}
          </span>
          <Button size="sm" variant="ghost" onClick={runningSince === null ? resume : pause}>
            {runningSince === null ? <Play /> : <Pause />}
            {runningSince === null ? "Resume" : "Pause"}
          </Button>
          <div className="ml-auto flex min-w-[10rem] flex-1 items-center gap-2 sm:max-w-xs">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <span
                className={cn(
                  "block h-full rounded-full transition-all",
                  wordRatio > 1.15 ? "bg-destructive" : wordRatio >= 0.8 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${Math.min(100, wordRatio * 100)}%` }}
              />
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {words}/{format.words} words
            </span>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder={"Start with a sharp introduction — a definition, a thinker or a contemporary hook…\n\nTip: use short paragraphs and '-' bullets; headings are fine."}
          className="min-h-[55vh] w-full resize-y rounded-lg border bg-background px-4 py-3 text-[15px] leading-7 outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Your answer"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={finish} disabled={words === 0}>
            <Check /> Finish & evaluate
          </Button>
          <span className="text-xs text-muted-foreground">
            Autosaved — you can leave and come back.
          </span>
          <Button
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={() => {
              if (words === 0 || window.confirm("Discard this answer?")) {
                closed.current = true;
                onDiscard();
              }
            }}
          >
            <Trash2 /> Discard
          </Button>
        </div>
      </div>

      <aside className="space-y-5 text-sm lg:sticky lg:top-16 lg:self-start">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Answer framework</p>
          <ol className="space-y-1.5">
            {ANSWER_FRAMEWORK.map((item, index) => (
              <li key={item.step} className="flex gap-2">
                <span className="tag tag-gray h-5 shrink-0 tabular-nums">{index + 1}</span>
                <span>
                  <span className="font-medium">{item.step}</span>
                  <span className="block text-xs leading-snug text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {thinkers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Thinkers worth citing</p>
            <ul className="space-y-1.5">
              {thinkers.map((thinker) => (
                <li key={thinker.id} className="rounded-md border p-2">
                  <p className="font-medium">{thinker.name}</p>
                  {thinker.quotes[0] && (
                    <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
                      “{thinker.quotes[0]}”
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
