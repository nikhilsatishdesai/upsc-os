"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { usePracticeStore } from "@/store/practice-store";
import { usePrefsStore } from "@/store/prefs-store";
import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/** First-week checklist that ticks itself off from real usage. */
export function GettingStarted() {
  const mounted = useMounted();
  const displayName = useAppStore((state) => state.displayName);
  const planner = useAppStore((state) => state.planner);
  const recent = useAppStore((state) => state.recentTopics.length);
  const notes = useKnowledgeStore((state) => Object.keys(state.richNotes).length);
  const answers = usePracticeStore((state) => Object.keys(state.answers).length);
  const thinkers = usePracticeStore((state) => Object.keys(state.thinkers).length);
  const optional = usePrefsStore((state) => state.optionalSubject);
  const targets = usePrefsStore((state) => state.targets);
  const dismissed = usePrefsStore((state) => state.onboardingDismissed);
  const dismiss = usePrefsStore((state) => state.setOnboardingDismissed);
  const ai = useAiStore((state) => aiConfigured(state.providers));

  if (!mounted || dismissed) return null;

  const hasTarget =
    [targets.studyHours, targets.sessions, targets.answers, targets.flashcardReviews].some(
      (value) => typeof value === "number",
    ) || Object.keys(targets.paperDeadlines).length > 0;

  const steps = [
    { done: displayName.trim() !== "", label: "Tell us your name & target attempt", href: "/settings#profile" },
    { done: !!planner, label: "Build your study plan", href: "/planner" },
    { done: planner?.weekdayHours?.some((h) => h !== null) || planner?.dayFocus?.some((f) => f !== null) || false, label: "Shape your weekly timetable", href: "/planner" },
    { done: hasTarget, label: "Set personal targets", href: "/settings#targets" },
    { done: recent > 0 || notes > 0, label: "Open a topic and start its notes", href: "/syllabus" },
    ...(optional === "psir"
      ? [
          { done: answers > 0, label: "Write your first timed PSIR answer", href: "/practice" },
          { done: thinkers > 0, label: "Mark a thinker in the vault", href: "/psir/thinkers" },
        ]
      : [{ done: answers > 0, label: "Write your first timed answer", href: "/practice" }]),
    { done: ai, label: "Connect Chanakya, your AI mentor (optional)", href: "/settings" },
  ];
  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length) return null;

  return (
    <section className="rounded-lg border p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">🚀 Getting started</h2>
          <p className="text-sm text-muted-foreground">
            {completed} of {steps.length} done — each step makes the OS more yours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismiss(true)}
          aria-label="Hide getting started"
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-secondary/70"
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px]",
                  step.done ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {step.done ? "✓" : ""}
              </span>
              <span className={cn(step.done && "text-muted-foreground line-through")}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
