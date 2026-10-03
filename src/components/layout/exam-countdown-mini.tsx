"use client";

import Link from "next/link";
import { CalendarClock, Flame } from "lucide-react";

import { currentStreak } from "@/lib/planner/analytics";
import { diffDays, todayStr } from "@/lib/planner/dates";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import * as React from "react";

/** Sidebar footer widget: days to Prelims/Mains + study streak. Always
 * visible, so the deadline is never out of sight. */
export function ExamCountdownMini({ className }: { className?: string }) {
  const mounted = useMounted();
  const examDate = useAppStore((state) => state.examDate);
  const mainsDate = useAppStore((state) => state.planner?.mainsDate ?? "");
  const tasks = useAppStore((state) => state.tasks);

  const streak = React.useMemo(
    () => (mounted ? currentStreak(Object.values(tasks), todayStr()) : 0),
    [mounted, tasks],
  );

  if (!mounted) return <div className={cn("h-[68px]", className)} />;

  const today = todayStr();
  const rows = [
    { label: "Prelims", date: examDate },
    { label: "Mains", date: mainsDate },
  ].filter((row) => row.date !== "" && diffDays(today, row.date) >= 0);

  if (rows.length === 0) {
    return (
      <Link
        href="/planner"
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
          className,
        )}
      >
        <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
        Set your exam dates to start the countdown
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/70 px-3 py-2.5 shadow-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {row.label}
            </p>
            <p className="text-lg font-semibold tabular-nums leading-tight tracking-tight">
              {diffDays(today, row.date)}
              <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                d
              </span>
            </p>
          </div>
        ))}
        <div
          className={cn(
            "flex flex-col items-end",
            streak > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          )}
          title={`${streak}-day study streak`}
        >
          <Flame className="h-4 w-4" />
          <span className="text-[11px] font-medium tabular-nums">
            {streak}d streak
          </span>
        </div>
      </div>
    </div>
  );
}
