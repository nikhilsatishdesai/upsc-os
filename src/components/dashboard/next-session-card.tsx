"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import { SLOT_LABEL, SLOT_ORDER } from "@/lib/planner/config";
import { todayStr } from "@/lib/planner/dates";
import { paperShortName, subjectNameOf } from "@/lib/planner/intel";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StartFocusButton } from "@/components/focus/start-focus-button";

/**
 * "What do I do right now?" — the next pending session today, one tap to
 * start a focus timer or mark it done. Falls back to setup / rest states.
 */
export function NextSessionCard() {
  const mounted = useMounted();
  const planner = useAppStore((state) => state.planner);
  const tasksMap = useAppStore((state) => state.tasks);
  const completeTask = useAppStore((state) => state.completeTask);

  const today = todayStr();
  const { next, remaining, done, total } = React.useMemo(() => {
    const todays = Object.values(tasksMap)
      .filter((task) => task.date === today && task.status !== "skipped" && task.status !== "missed")
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.id.localeCompare(b.id));
    const pending = todays.filter((task) => task.status === "pending");
    return {
      next: pending[0] ?? null,
      remaining: pending.length,
      done: todays.length - pending.length,
      total: todays.length,
    };
  }, [tasksMap, today]);

  if (!mounted) return <Skeleton className="h-28 w-full" />;

  if (!planner) {
    return (
      <div className="callout items-center">
        <span aria-hidden className="text-2xl leading-none">🧭</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Build your study plan — about two minutes</p>
          <p className="text-sm text-muted-foreground">
            Tell the planner your exam dates and daily hours; it schedules every
            topic (PSIR included), spaced revisions and rest days, and adapts
            when life happens.
          </p>
        </div>
        <Button asChild>
          <Link href="/planner">
            Start <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  if (!next) {
    return (
      <div className="callout items-center">
        <span aria-hidden className="text-2xl leading-none">{total > 0 ? "🎉" : "☕"}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {total > 0 ? "Today's plan is done." : "Nothing scheduled today."}
          </p>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${done} session${done === 1 ? "" : "s"} completed. Write a timed answer or review flashcards to bank extra marks.`
              : "Rest day or a free day — the plan picks up tomorrow."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/practice">Write an answer</Link>
        </Button>
      </div>
    );
  }

  const node = getNode(next.topicId);
  return (
    <div className="rounded-lg border p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Up next</span>
        <span>·</span>
        <span>{SLOT_LABEL[next.slot]}</span>
        <span>·</span>
        <span>
          {done}/{total} done today · {remaining} left
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-[1_1_16rem]">
          <Link
            href={`/syllabus/${next.topicId}`}
            className="text-lg font-semibold leading-snug hover:underline"
          >
            {next.kind === "revision" && <span className="tag tag-purple mr-2 align-middle">Revise</span>}
            {node?.title ?? next.topicId}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {paperShortName(next.topicId)} · {subjectNameOf(next.topicId)} · {next.minutes} min
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StartFocusButton
            topicId={next.topicId}
            taskId={next.id}
            minutes={next.minutes}
            size="default"
          />
          <Button variant="outline" onClick={() => completeTask(next.id)}>
            <Check /> Mark done
          </Button>
        </div>
      </div>
    </div>
  );
}
