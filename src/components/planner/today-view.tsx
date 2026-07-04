"use client";

import * as React from "react";
import Link from "next/link";
import { Coffee, PartyPopper, Target } from "lucide-react";

import { SLOT_LABEL, SLOT_ORDER } from "@/lib/planner/config";
import { dayCapacity, slotStartTime } from "@/lib/planner/capacity";
import { todayStr, formatDateLong } from "@/lib/planner/dates";
import { resolveTopicIntel } from "@/lib/planner/intel";
import type { PlannedTask, PlannerSettings, TaskSlot } from "@/lib/planner/types";
import { getTopicState } from "@/lib/stages";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { TaskCard } from "@/components/planner/task-card";

/** "HH:MM" plus minutes → "HH:MM" (clamped to the same day). */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

export function TodayView({ settings }: { settings: PlannerSettings }) {
  const tasks = useAppStore((state) => state.tasks);
  const topics = useAppStore((state) => state.topics);
  const today = todayStr();

  const mission = React.useMemo(() => {
    const todayTasks = Object.values(tasks)
      .filter((task) => task.date === today)
      .sort(
        (a, b) =>
          SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) ||
          a.id.localeCompare(b.id),
      );

    const active = todayTasks.filter((t) => t.status !== "skipped");
    const plannedMinutes = active.reduce((sum, t) => sum + t.minutes, 0);
    const completedMinutes = active
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.minutes, 0);
    const remainingMinutes = active
      .filter((t) => t.status === "pending")
      .reduce((sum, t) => sum + t.minutes, 0);

    const revisionCount = active.filter((t) => t.kind === "revision").length;
    const priorityCount = active.filter((t) => {
      const intel = resolveTopicIntel(
        t.topicId,
        getTopicState(topics, t.topicId),
      );
      return intel.priorityRank <= 1; // critical or high
    }).length;

    // Expected finish: start of the last occupied slot + its workload.
    let expectedFinish: string | null = null;
    for (const slot of [...SLOT_ORDER].reverse() as TaskSlot[]) {
      const slotMinutes = active
        .filter((t) => t.slot === slot)
        .reduce((sum, t) => sum + t.minutes, 0);
      if (slotMinutes > 0) {
        expectedFinish = addMinutesToTime(
          slotStartTime(slot, settings),
          slotMinutes,
        );
        break;
      }
    }

    return {
      todayTasks,
      plannedMinutes,
      completedMinutes,
      remainingMinutes,
      revisionCount,
      priorityCount,
      expectedFinish,
      percent:
        plannedMinutes === 0
          ? 0
          : Math.round((completedMinutes / plannedMinutes) * 100),
    };
  }, [tasks, topics, today, settings]);

  const day = dayCapacity(today, settings);

  if (day.isOffDay && mission.todayTasks.length === 0) {
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

  if (mission.todayTasks.length === 0) {
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
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-5">
            <ProgressRing
              percent={mission.percent}
              label={`${mission.percent}% of today's mission done`}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" /> Today&apos;s
                Mission
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateLong(today)}
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.round((mission.plannedMinutes / 60) * 10) / 10}h planned
                · {Math.round((mission.remainingMinutes / 60) * 10) / 10}h
                remaining
                {mission.expectedFinish &&
                  mission.remainingMinutes > 0 &&
                  ` · expected finish ~${mission.expectedFinish}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {mission.todayTasks.filter((t) => t.status !== "skipped").length}{" "}
                sessions · {mission.priorityCount} high-priority ·{" "}
                {mission.revisionCount} revision
                {mission.revisionCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {SLOT_ORDER.map((slot) => {
        const slotTasks = mission.todayTasks.filter(
          (task) => task.slot === slot,
        );
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
              {slotTasks.map((task: PlannedTask) => (
                <TaskCard key={task.id} task={task} siblings={slotTasks} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
