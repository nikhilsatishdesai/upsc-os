"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookMarked,
  ChevronDown,
  Link2,
  PenLine,
  Quote,
} from "lucide-react";

import { getNode } from "@/lib/syllabus";
import {
  psirTopicLabel,
  questionsForTopic,
  sourcesForTopic,
  synergyForTopic,
  thinkersForTopic,
} from "@/lib/psir";
import { SOURCE_TIER_META } from "@/data/psir/sources";
import type { Thinker } from "@/data/psir/types";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Everything PSIR-specific about one topic in one panel: thinkers to cite,
 * timed practice questions, the GS areas it also prepares, and what to
 * read. Shown above the workspace on every PSIR topic page.
 */
export function PsirToolkit({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const answers = usePracticeStore((state) => state.answers);
  const thinkers = thinkersForTopic(topicId);
  const questions = questionsForTopic(topicId);
  const synergy = synergyForTopic(topicId);
  const sources = sourcesForTopic(topicId)
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier))
    .slice(0, 5);

  const attemptsByQuestion = React.useMemo(() => {
    const counts = new Map<string, number>();
    if (!mounted) return counts;
    for (const answer of Object.values(answers)) {
      if (answer.questionId) {
        counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [answers, mounted]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/50 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-xl leading-none">🧰</span>
          <div>
            <p className="text-sm font-semibold">PSIR toolkit</p>
            <p className="text-xs text-muted-foreground">{psirTopicLabel(topicId)}</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/practice?topic=${encodeURIComponent(topicId)}`}>
            <PenLine /> Practise this topic
          </Link>
        </Button>
      </div>

      <CardContent className="grid gap-6 pt-5 lg:grid-cols-2">
        <section className="space-y-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Quote className="h-3.5 w-3.5" /> Thinkers to cite
          </h3>
          {thinkers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Current-affairs driven — cite MEA positions, joint statements and
              data instead. Browse the{" "}
              <Link href="/psir/thinkers" className="text-primary hover:underline">
                thinkers vault
              </Link>{" "}
              for IR theory to frame them.
            </p>
          ) : (
            <ul className="space-y-2">
              {thinkers.slice(0, 5).map((thinker) => (
                <ThinkerRow key={thinker.id} thinker={thinker} />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PenLine className="h-3.5 w-3.5" /> Practice questions
          </h3>
          <ul className="space-y-2">
            {questions.map((question) => {
              const attempts = attemptsByQuestion.get(question.id) ?? 0;
              return (
                <li
                  key={question.id}
                  className="flex items-start gap-3 rounded-md border p-2.5"
                >
                  <span className="tag tag-gray mt-0.5 shrink-0 font-semibold tabular-nums">
                    {question.marks}M
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-snug">{question.text}</p>
                  <Link
                    href={`/practice?q=${question.id}`}
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      attempts > 0
                        ? "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                        : "text-primary hover:bg-primary/10",
                    )}
                  >
                    {attempts > 0 ? `Written ×${attempts}` : "Write"}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            UPSC-style practice prompts. Add real PYQs for this topic in the
            Previous Year Questions section below.
          </p>
        </section>

        {synergy && (
          <section className="space-y-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-3.5 w-3.5" /> Also prepares
            </h3>
            <p className="text-sm text-muted-foreground">{synergy.note}</p>
            <div className="flex flex-wrap gap-1.5">
              {synergy.targets.map((target) => {
                const node = getNode(target);
                if (!node) return null;
                return (
                  <Link
                    key={target}
                    href={`/syllabus/${target}`}
                    className="tag tag-gray max-w-full transition-opacity hover:opacity-80"
                  >
                    <span className="truncate">{shortTitle(node.title)}</span>
                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BookMarked className="h-3.5 w-3.5" /> Read from
          </h3>
          <ul className="space-y-1.5">
            {sources.map((source) => (
              <li key={source.id} className="flex items-start gap-2 text-sm">
                <span className={cn("tag mt-0.5 shrink-0", SOURCE_TIER_META[source.tier].badge)}>
                  {SOURCE_TIER_META[source.tier].label}
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{source.title}</span>
                  <span className="text-muted-foreground"> — {source.author}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/psir/books" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Full booklist & reading tracker <ArrowUpRight className="h-3 w-3" />
          </Link>
        </section>
      </CardContent>
    </Card>
  );
}

function ThinkerRow({ thinker }: { thinker: Thinker }) {
  const [open, setOpen] = React.useState(false);
  return (
    <li className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{thinker.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{thinker.tip}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t px-3 py-2.5 text-sm">
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            {thinker.ideas.slice(0, 3).map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
          {thinker.quotes[0] && (
            <blockquote className="border-l-[3px] border-foreground/80 pl-3 text-[13px]">
              “{thinker.quotes[0]}”
            </blockquote>
          )}
          <Link
            href={`/psir/thinkers#${thinker.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Full thinker sheet <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </li>
  );
}

function tierRank(tier: string): number {
  return ["foundation", "core", "supplementary", "current"].indexOf(tier);
}

function shortTitle(title: string): string {
  return title.length > 48 ? `${title.slice(0, 46)}…` : title;
}
