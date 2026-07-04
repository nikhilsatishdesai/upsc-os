"use client";

import * as React from "react";
import { Coffee } from "lucide-react";

import { cn } from "@/lib/utils";
import { dayCapacity } from "@/lib/planner/capacity";
import { addDays, formatDayShort, todayStr } from "@/lib/planner/dates";
import type { PlannedTask, PlannerSettings } from "@/lib/planner/types";
import { useAppStore } from "@/store/app-store";
import { TaskCard } from "@/components/planner/task-card";

const WEEK_DAYS = 7;

/** The next seven days as drag-and-drop columns. */
export function WeekView({ settings }: { settings: PlannerSettings }) {
  const tasks = useAppStore((state) => state.tasks);
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
      return { date, dayTasks, capacity: dayCapacity(date, settings) };
    });
  }, [tasks, today, settings]);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
      <div className="flex gap-3" style={{ minWidth: "56rem" }}>
        {days.map(({ date, dayTasks, capacity }) => {
          const plannedMinutes = dayTasks
            .filter((t) => t.status === "pending" || t.status === "completed")
            .reduce((sum, t) => sum + t.minutes, 0);
          return (
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
              <div className="flex items-baseline justify-between px-1">
                <p className="text-xs font-semibold">
                  {date === today ? "Today" : formatDayShort(date)}
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
          );
        })}
      </div>
    </div>
  );
}
