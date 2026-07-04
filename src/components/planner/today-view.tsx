"use client";

import * as React from "react";
import Link from "next/link";
import { Coffee, PartyPopper } from "lucide-react";

import { SLOT_LABEL, SLOT_ORDER } from "@/lib/planner/config";
import { dayCapacity, slotStartTime } from "@/lib/planner/capacity";
import { todayStr, formatDateLong } from "@/lib/planner/dates";
import type { PlannerSettings } from "@/lib/planner/types";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TaskCard } from "@/components/planner/task-card";

export function TodayView({ settings }: { settings: PlannerSettings }) {
  const tasks = useAppStore((state) => state.tasks);
  const today = todayStr();

  const todayTasks = React.useMemo(
    () =>
      Object.values(tasks)
        .filter((task) => task.date === today)
        .sort(
          (a, b) =>
            SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) ||
            a.id.localeCompare(b.id),
        ),
    [tasks, today],
  );

  const day = dayCapacity(today, settings);
  const plannedMinutes = todayTasks
    .filter((t) => t.status !== "skipped")
    .reduce((sum, t) => sum + t.minutes, 0);
  const completedMinutes = todayTasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.minutes, 0);
  const remainingMinutes = todayTasks
    .filter((t) => t.status === "pending")
    .reduce((sum, t) => sum + t.minutes, 0);
  const percent =
    plannedMinutes === 0
      ? 0
      : Math.round((completedMinutes / plannedMinutes) * 100);

  if (day.isOffDay && todayTasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Coffee className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">It&apos;s your weekly off day</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Rest is part of the plan. Your next study day is already
            scheduled — check the Week tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <PartyPopper className="h-8 w-8 text-primary" />
          <p className="font-medium">Nothing scheduled today</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Either everything is done or there is no remaining workload. Add
            more depth via topic stages on the{" "}
            <Link href="/syllabus" className="text-primary hover:underline">
              syllabus
            </Link>{" "}
            or adjust Planner settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{formatDateLong(today)}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round((plannedMinutes / 60) * 10) / 10}h planned ·{" "}
              {Math.round((remainingMinutes / 60) * 10) / 10}h remaining
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={percent} className="h-2 flex-1" />
            <span className="text-sm font-semibold tabular-nums">
              {percent}%
            </span>
          </div>
        </CardContent>
      </Card>

      {SLOT_ORDER.map((slot) => {
        const slotTasks = todayTasks.filter((task) => task.slot === slot);
        if (slotTasks.length === 0) return null;
        return (
          <section key={slot} className="space-y-2">
            <h3 className="flex items-baseline gap-2 text-sm font-semibold">
              {SLOT_LABEL[slot]}
              <span className="text-xs font-normal text-muted-foreground">
                from {slotStartTime(slot, settings)}
              </span>
            </h3>
            <div className="space-y-2">
              {slotTasks.map((task) => (
                <TaskCard key={task.id} task={task} siblings={slotTasks} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
