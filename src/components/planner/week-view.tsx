"use client";

import * as React from "react";
import { Coffee } from "lucide-react";

import { cn } from "@/lib/utils";
import { dayCapacity } from "@/lib/planner/capacity";
import { PLANNER_CONFIG } from "@/lib/planner/config";
import {
  addDays,
  formatDateLong,
  formatDayShort,
  todayStr,
} from "@/lib/planner/dates";
import { recentMissed } from "@/lib/planner/analytics";
import { computeForecast } from "@/lib/planner/forecast";
import type { PlannedTask, PlannerSettings } from "@/lib/planner/types";
import { useAppStore } from "@/store/app-store";
import { TaskCard } from "@/components/planner/task-card";

const WEEK_DAYS = 7;

type DayLabel = "rest" | "heavy" | "light" | "revision" | null;

const DAY_LABEL_META: Record<
  Exclude<DayLabel, null>,
  { label: string; className: string }
> = {
  rest: { label: "Rest", className: "text-muted-foreground" },
  heavy: {
    label: "Heavy",
    className: "text-red-600 dark:text-red-400",
  },
  light: {
    label: "Light",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  revision: {
    label: "Revision day",
    className: "text-violet-600 dark:text-violet-400",
  },
};

/** The next seven days as drag-and-drop columns with intelligence labels. */
export function WeekView({ settings }: { settings: PlannerSettings }) {
  const tasks = useAppStore((state) => state.tasks);
  const topics = useAppStore((state) => state.topics);
  const examDate = useAppStore((state) => state.examDate);
  const moveTask = useAppStore((state) => state.moveTask);
  const today = todayStr();

  const days = React.useMemo(() => {
    const byDate = new Map<string, PlannedTask[]>();
    for (const task of Object.values(tasks)) {
      byDate.set(task.date, [...(byDate.get(task.date) ?? []), task]);
    }
    return Array.from({ length: WEEK_DAYS }, (_, offset) => {
      const date = addDays(today, offset);
      const dayTasks = (byDate.get(date) ?? []).sort((a, b) =>
        a.slot === b.slot
          ? a.id.localeCompare(b.id)
          : a.slot.localeCompare(b.slot),
      );
      const capacity = dayCapacity(date, settings);
      const plannedMinutes = dayTasks
        .filter((t) => t.status === "pending" || t.status === "completed")
        .reduce((sum, t) => sum + t.minutes, 0);
      const revisionMinutes = dayTasks
        .filter((t) => t.kind === "revision" && t.status !== "skipped")
        .reduce((sum, t) => sum + t.minutes, 0);

      let label: DayLabel = null;
      if (capacity.isOffDay || (plannedMinutes === 0 && dayTasks.length === 0)) {
        label = capacity.isOffDay ? "rest" : null;
      } else if (revisionMinutes >= plannedMinutes / 2) {
        label = "revision";
      } else if (
        plannedMinutes >=
        capacity.capacityMinutes * PLANNER_CONFIG.heavyDayLoadRatio
      ) {
        label = "heavy";
      } else if (
        plannedMinutes <=
        capacity.capacityMinutes * PLANNER_CONFIG.lightDayLoadRatio
      ) {
        label = "light";
      }

      return { date, dayTasks, capacity, plannedMinutes, label };
    });
  }, [tasks, today, settings]);

  const intelligence = React.useMemo(() => {
    const all = Object.values(tasks);
    return {
      missed: recentMissed(all, 7, today).length,
      forecast: computeForecast(topics, settings, examDate, today),
    };
  }, [tasks, topics, settings, examDate, today]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {intelligence.forecast.expectedCompletionDate && (
          <>
            Estimated syllabus completion:{" "}
            <span className="font-medium text-foreground">
              {formatDateLong(intelligence.forecast.expectedCompletionDate)}
            </span>
          </>
        )}
        {intelligence.missed > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            {" "}
            · {intelligence.missed} missed task
            {intelligence.missed === 1 ? "" : "s"} redistributed this week
          </span>
        )}
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        <div className="flex gap-3" style={{ minWidth: "56rem" }}>
          {days.map(({ date, dayTasks, capacity, plannedMinutes, label }) => (
            <div
              key={date}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain");
                if (taskId) moveTask(taskId, date);
              }}
              className={cn(
                "flex min-h-48 w-56 shrink-0 flex-col gap-2 rounded-xl border bg-secondary/30 p-2",
                date === today && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-baseline justify-between gap-1 px-1">
                <p className="text-xs font-semibold">
                  {date === today ? "Today" : formatDayShort(date)}
                  {label && (
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-medium",
                        DAY_LABEL_META[label].className,
                      )}
                    >
                      {DAY_LABEL_META[label].label}
                    </span>
                  )}
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {capacity.isOffDay
                    ? "Off day"
                    : `${Math.round((plannedMinutes / 60) * 10) / 10}h / ${
                        Math.round((capacity.capacityMinutes / 60) * 10) / 10
                      }h`}
                </p>
              </div>

              {capacity.isOffDay && dayTasks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Coffee className="h-4 w-4" />
                  <span className="text-[11px]">Rest day</span>
                </div>
              ) : dayTasks.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
                  Drop tasks here
                </p>
              ) : (
                <div className="space-y-1.5">
                  {dayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      siblings={dayTasks}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
