"use client";

import * as React from "react";
import Link from "next/link";

import { getNode } from "@/lib/syllabus";
import { formatDateLong } from "@/lib/planner/dates";
import { paperDeadlineStatus, weeklyTargetProgress } from "@/lib/targets";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { usePracticeStore } from "@/store/practice-store";
import { usePrefsStore } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DEADLINE_TAG = {
  done: "tag-green",
  "on-track": "tag-green",
  behind: "tag-orange",
  overdue: "tag-red",
} as const;

const DEADLINE_LABEL = {
  done: "Done",
  "on-track": "On track",
  behind: "Behind",
  overdue: "Overdue",
} as const;

/** This week's personal targets and first-reading deadlines. */
export function TargetsCard() {
  const mounted = useMounted();
  const targets = usePrefsStore((state) => state.targets);
  const tasks = useAppStore((state) => state.tasks);
  const topics = useAppStore((state) => state.topics);
  const answers = usePracticeStore((state) => state.answers);
  const events = useKnowledgeStore((state) => state.events);

  const weekly = React.useMemo(
    () =>
      weeklyTargetProgress({
        targets,
        tasks: Object.values(tasks),
        answers: Object.values(answers),
        events,
      }),
    [targets, tasks, answers, events],
  );
  const deadlines = React.useMemo(
    () =>
      Object.entries(targets.paperDeadlines)
        .map(([paperId, date]) => paperDeadlineStatus(topics, paperId, date))
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [targets.paperDeadlines, topics],
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-[15px]">🎯 My targets</CardTitle>
        <Link href="/settings#targets" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Edit
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {!mounted ? (
          <Skeleton className="h-24 w-full" />
        ) : weekly.length === 0 && deadlines.length === 0 ? (
          <div className="callout text-sm">
            <span aria-hidden>📈</span>
            <p>
              Set weekly goals — study hours, answers written, flashcard
              reviews — and deadlines like “PSIR Paper I first reading by
              December”.{" "}
              <Link href="/settings#targets" className="font-medium underline">
                Set my targets
              </Link>
            </p>
          </div>
        ) : (
          <>
            {weekly.length > 0 && (
              <ul className="space-y-3">
                {weekly.map((item) => (
                  <li key={item.key}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{item.label}</span>
                      <span className={cn("tabular-nums", item.met ? "font-medium text-success" : "text-muted-foreground")}>
                        {item.current}
                        {item.unit} / {item.target}
                        {item.unit} {item.met && "✓"}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full transition-all", item.met ? "bg-success" : "bg-primary")}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {deadlines.length > 0 && (
              <ul className="divide-y border-t pt-1">
                {deadlines.map((status) => (
                  <li key={status.paperId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {getNode(status.paperId)?.title}
                    </span>
                    <span className={cn("tag", DEADLINE_TAG[status.status])}>
                      {DEADLINE_LABEL[status.status]}
                    </span>
                    <span className="w-full text-xs text-muted-foreground">
                      {status.done}/{status.total} read by {formatDateLong(status.deadline)}
                      {status.status !== "done" &&
                        ` · need ${status.requiredPerWeek}/week, recent pace ${status.recentPerWeek}/week`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
