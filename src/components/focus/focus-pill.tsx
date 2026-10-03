"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Pause, Play, Timer, X } from "lucide-react";

import {
  elapsedSeconds,
  focusProgress,
  formatClock,
  remainingSeconds,
} from "@/lib/focus";
import { useFocusStore } from "@/store/focus-store";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/** A soft two-tone chime when the planned time is up (best-effort). */
function chime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = ctx.currentTime + index * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    /* audio is a nicety — never fail the timer over it */
  }
}

/**
 * The floating focus timer. Lives in the app layout so a running session
 * follows the student across pages; "Done" completes the planner task.
 */
export function FocusPill() {
  const mounted = useMounted();
  const session = useFocusStore((state) => state.session);
  const pause = useFocusStore((state) => state.pause);
  const resume = useFocusStore((state) => state.resume);
  const clear = useFocusStore((state) => state.clear);
  const completeTask = useAppStore((state) => state.completeTask);
  const taskPending = useAppStore((state) =>
    session?.taskId ? state.tasks[session.taskId]?.status === "pending" : false,
  );

  const [now, setNow] = React.useState(() => Date.now());
  const running = session?.runningSince != null;

  React.useEffect(() => {
    if (!session) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = running ? window.setInterval(tick, 1000) : undefined;
    return () => {
      window.clearTimeout(first);
      if (id !== undefined) window.clearInterval(id);
    };
  }, [session, running]);

  const remaining = session ? remainingSeconds(session, now) : 0;
  const overtime = remaining < 0;

  // Chime once when the planned time runs out.
  const chimedFor = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!session || !running) return;
    if (overtime && chimedFor.current !== session.startedAt) {
      chimedFor.current = session.startedAt;
      chime();
    }
  }, [overtime, running, session]);

  // Show the countdown in the browser tab while focusing. The page's own
  // title is re-captured on every tick (navigation changes it) and put
  // back when the session ends.
  const baseTitle = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!session) {
      if (baseTitle.current !== null) {
        document.title = baseTitle.current;
        baseTitle.current = null;
      }
      return;
    }
    if (!/^[⏱⏰] /u.test(document.title)) baseTitle.current = document.title;
    document.title = `${overtime ? "⏰" : "⏱"} ${formatClock(remaining)} · ${session.label}`;
  }, [session, remaining, overtime]);

  if (!mounted || !session) return null;

  const progress = focusProgress(session, now);
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  const finish = () => {
    if (session.taskId && taskPending) completeTask(session.taskId);
    clear();
  };

  return (
    <div
      role="region"
      aria-label="Focus timer"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 md:inset-x-auto md:bottom-6 md:right-6 md:w-[22rem]"
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-card/95 p-2.5 pr-3 shadow-lift backdrop-blur-md",
          overtime && "border-amber-500/50",
        )}
      >
        <div className="relative h-10 w-10 shrink-0">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3" className="stroke-secondary" />
            <circle
              cx="18"
              cy="18"
              r={radius}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className={cn(
                "transition-[stroke-dashoffset] duration-1000",
                overtime ? "stroke-amber-500" : "stroke-primary",
              )}
            />
          </svg>
          <Timer className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/syllabus/${session.topicId}`}
            title={session.label}
            className="block truncate text-xs text-muted-foreground hover:text-foreground"
          >
            {session.label}
          </Link>
          <p className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span
              className={cn(
                "font-mono text-lg font-semibold tabular-nums leading-tight",
                overtime && "text-amber-600 dark:text-amber-400",
              )}
            >
              {formatClock(remaining)}
            </span>
            <span
              className="truncate text-[11px] text-muted-foreground"
              title={`${formatClock(elapsedSeconds(session, now))} elapsed`}
            >
              {overtime ? "time's up" : running ? "left" : "paused"}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={running ? pause : resume}
            aria-label={running ? "Pause" : "Resume"}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-secondary/70"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={finish}
            aria-label={session.taskId && taskPending ? "Done — mark session complete" : "Finish"}
            title={session.taskId && taskPending ? "Done — marks the planner session complete" : "Finish"}
            className="flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" /> Done
          </button>
          <button
            type="button"
            onClick={clear}
            aria-label="Discard focus session"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
