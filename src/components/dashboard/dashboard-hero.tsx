"use client";

import * as React from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { getRoots } from "@/lib/syllabus";
import { summarizeMany } from "@/lib/progress";
import { currentStreak } from "@/lib/planner/analytics";
import { diffDays, formatDateLong, todayStr } from "@/lib/planner/dates";
import { currentWeek } from "@/lib/targets";
import { useAppStore } from "@/store/app-store";
import { usePrefsStore } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";

const ROOT_IDS = getRoots().map((root) => root.id);

function greeting(hour: number): { text: string; emoji: string } {
  if (hour < 5) return { text: "Burning the midnight oil", emoji: "🌙" };
  if (hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good afternoon", emoji: "☀️" };
  return { text: "Good evening", emoji: "🌆" };
}

/** Notion-style home header: greeting, date, countdowns and a stat strip. */
export function DashboardHero() {
  const mounted = useMounted();
  const displayName = useAppStore((state) => state.displayName);
  const examDate = useAppStore((state) => state.examDate);
  const mainsDate = useAppStore((state) => state.planner?.mainsDate ?? "");
  const topics = useAppStore((state) => state.topics);
  const tasksMap = useAppStore((state) => state.tasks);
  const attemptYear = usePrefsStore((state) => state.attemptYear);

  const stats = React.useMemo(() => {
    if (!mounted) return null;
    const today = todayStr();
    const tasks = Object.values(tasksMap);
    const { start } = currentWeek(today);
    const weekMinutes = tasks
      .filter((task) => task.status === "completed" && task.completedAt && task.date >= start && task.date <= today)
      .reduce((sum, task) => sum + task.minutes, 0);
    const summary = summarizeMany(topics, ROOT_IDS);
    return {
      summary,
      streak: currentStreak(tasks, today),
      weekHours: Math.round((weekMinutes / 60) * 10) / 10,
    };
  }, [mounted, topics, tasksMap]);

  const hello = mounted ? greeting(new Date().getHours()) : { text: "Welcome", emoji: "👋" };
  const name = mounted && displayName.trim() ? `, ${displayName.trim()}` : "";
  const today = todayStr();
  const prelims = mounted && examDate ? diffDays(today, examDate) : null;
  const mains = mounted && mainsDate ? diffDays(today, mainsDate) : null;

  return (
    <header className="space-y-4">
      <div aria-hidden className="select-none text-[52px] leading-none md:text-[60px]">
        {hello.emoji}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight md:text-[40px]">
            {hello.text}
            {name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>{mounted ? formatDateLong(today) : " "}</span>
            {mounted && attemptYear && <span className="tag tag-blue">CSE {attemptYear}</span>}
            {prelims !== null && prelims >= 0 && (
              <span className="tag tag-yellow">Prelims in {prelims} days</span>
            )}
            {mains !== null && mains >= 0 && (
              <span className="tag tag-purple">Mains in {mains} days</span>
            )}
          </div>
        </div>
        <Link
          href="/settings#dashboard"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" /> Customise
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Prepared"
          value={stats ? `${stats.summary.percent}%` : "—"}
          detail="stage-weighted, honest"
        />
        <Stat
          label="Topics started"
          value={stats ? `${stats.summary.covered}/${stats.summary.total}` : "—"}
          detail={stats ? `${stats.summary.examReady} exam ready` : ""}
        />
        <Stat
          label="This week"
          value={stats ? `${stats.weekHours}h` : "—"}
          detail="completed study time"
        />
        <Stat
          label="Streak"
          value={stats ? `${stats.streak} 🔥` : "—"}
          detail="days in a row"
        />
      </div>
    </header>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
