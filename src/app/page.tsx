import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { TOTAL_LEAF_TOPICS } from "@/lib/syllabus";
import { THINKERS } from "@/data/psir/thinkers";
import { PSIR_QUESTIONS } from "@/data/psir/questions";

const features = [
  {
    emoji: "🗓️",
    title: "A plan that fits your real week",
    description:
      "Set hours and a subject focus for each weekday, your block timings and which papers need more time. The adaptive planner schedules every topic, spaced revisions and rest days — and replans when life happens.",
  },
  {
    emoji: "🏛️",
    title: "PSIR, completely",
    description: `Both papers as trackable topics, ${THINKERS.length} thinker sheets with quotes and critiques, a tiered booklist, a GS-synergy map and ${PSIR_QUESTIONS.length} practice questions.`,
  },
  {
    emoji: "✍️",
    title: "Answer writing under exam conditions",
    description:
      "A timer sized to the marks, a live word target, an honest self-evaluation rubric and an optional examiner-style review from your AI mentor.",
  },
  {
    emoji: "📚",
    title: `The whole syllabus as ${TOTAL_LEAF_TOPICS} pages`,
    description:
      "Every topic is a workspace: notes, flashcards, keywords, PYQs, current affairs, book references and your study history — browse it from a page tree like Notion.",
  },
  {
    emoji: "🎯",
    title: "Your targets, your dashboard",
    description:
      "Weekly goals for hours, answers and reviews, paper deadlines with required pace, a one-tap focus timer and a dashboard you can rearrange.",
  },
  {
    emoji: "🔒",
    title: "Private by design",
    description:
      "No account. Everything lives in your browser, with one-click backups. AI is optional and uses your own key.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-8">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/dashboard">Open app</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pb-14 pt-12 md:px-8 md:pt-20">
          <div aria-hidden className="text-[56px] leading-none">🏛️</div>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-6xl">
            The operating system for your UPSC preparation.
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            Plan your week, study every topic in its own workspace, write timed
            answers and track honest progress — with a complete PSIR optional
            built in. Calm, fast, and entirely yours.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Start preparing <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/psir">Explore PSIR</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free · no sign-up · works offline in your browser
          </p>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-20 md:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border p-5">
                <div aria-hidden className="text-2xl leading-none">{feature.emoji}</div>
                <h2 className="mt-3 font-semibold">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:px-8">
          <span>UPSC OS — built for serious aspirants.</span>
          <span>Your data never leaves your device.</span>
        </div>
      </footer>
    </div>
  );
}
