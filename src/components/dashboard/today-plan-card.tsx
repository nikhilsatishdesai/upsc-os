"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CircleCheck,
  Flame,
  RotateCw,
} from "lucide-react";

import {
  currentStreak,
  recentMissed,
  todaySummary,
  weeklyCompletion,
} from "@/lib/planner/analytics";
import { todayStr } from "@/lib/planner/dates";
import { SLOT_ORDER } from "@/lib/planner/config";
import { getNode } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MAX_LISTED = 5;

export function TodayPlanCard() {
  const mounted = useMounted();
  const planner = useAppStore((state) => state.planner);
  const tasksMap = useAppStore((state) => state.tasks);
  const completeTask = useAppStore((state) => state.completeTask);

  const tasks = React.useMemo(() => Object.values(tasksMap), [tasksMap]);
  const today = todayStr();

  const data = React.useMemo(() => {
    const todayTasks = tasks
      .filter((task) => task.date === today && task.status !== "skipped")
      .sort(
        (a, b) =>
          Number(a.status === "completed") - Number(b.status === "completed") ||
          SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
      );
    return {
      todayTasks,
      revisionsToday: todayTasks.filter((task) => task.kind === "revision"),
      summary: todaySummary(tasks, today),
      streak: currentStreak(tasks, today),
      week: weeklyCompletion(tasks, today),
      missed: recentMissed(tasks, 7, today).length,
    };
  }, [tasks, today]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4" /> Today&apos;s plan
          </span>
          {mounted && data.streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5" /> {data.streak}-day streak
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-24 w-full" />
        ) : !planner ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Answer eight quick questions and get an adaptive, day-by-day
              study plan for the whole syllabus.
            </p>
            <Link
              href="/planner"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Set up the planner <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : data.todayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled today — enjoy the rest or open the{" "}
            <Link href="/planner" className="text-primary hover:underline">
              planner
            </Link>{" "}
            to look ahead.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={data.summary.percent} className="h-2 flex-1" />
              <span className="text-sm font-semibold tabular-nums">
                {data.summary.percent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.pendingCount} task
              {data.summary.pendingCount === 1 ? "" : "s"} pending ·{" "}
              {Math.round((data.summary.remainingMinutes / 60) * 10) / 10}h
              remaining today · this week {data.week.percent}% done
              {data.missed > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  · {data.missed} missed recently{" "}
                  <RotateCw className="inline h-3 w-3" /> auto-replanned
                </span>
              )}
            </p>

            <ul className="-mx-2 divide-y divide-border/60">
              {data.todayTasks.slice(0, MAX_LISTED).map((task) => {
                const node = getNode(task.topicId);
                if (!node) return null;
                const done = task.status === "completed";
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-2.5 px-2 py-2"
                  >
                    <button
                      type="button"
                      aria-label={
                        done ? "Completed" : `Mark "${node.title}" completed`
                      }
                      disabled={done}
                      onClick={() => completeTask(task.id)}
                      className={cn(
                        "shrink-0",
                        done
                          ? "text-emerald-500"
                          : "text-muted-foreground transition-colors hover:text-primary",
                      )}
                    >
                      <CircleCheck className="h-4 w-4" />
                    </button>
                    <Link
                      href={`/syllabus/${task.topicId}`}
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm hover:text-primary",
                        done &&
                          "text-muted-foreground line-through decoration-1",
                      )}
                    >
                      {task.kind === "revision" && (
                        <span className="text-violet-600 dark:text-violet-400">
                          Revise:{" "}
                        </span>
                      )}
                      {node.title}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {task.minutes} min
                    </span>
                  </li>
                );
              })}
            </ul>

            {data.todayTasks.length > MAX_LISTED && (
              <Link
                href="/planner"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {data.todayTasks.length - MAX_LISTED} more in the planner{" "}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}

            <p className="text-xs text-muted-foreground">
              Revisions today:{" "}
              {data.revisionsToday.length > 0
                ? data.revisionsToday.length
                : "none due — spaced revisions appear automatically 3, 10 and 30 days after a reading."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
