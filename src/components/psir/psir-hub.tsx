"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Target } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import { summarizeProgress } from "@/lib/progress";
import { PRIORITY_META, getTopicState } from "@/lib/stages";
import { resolveTopicIntel } from "@/lib/planner/intel";
import { practiceStats } from "@/lib/practice/answers";
import {
  nextPsirTopics,
  PSIR_PAPER_IDS,
  psirSections,
  psirTopicLabel,
} from "@/lib/psir";
import { PSIR_PAPERS } from "@/data/psir/exam";
import { PSIR_SOURCES } from "@/data/psir/sources";
import { THINKERS } from "@/data/psir/thinkers";
import { useAppStore } from "@/store/app-store";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/layout/page-header";
import { StartFocusButton } from "@/components/focus/start-focus-button";
import { cn } from "@/lib/utils";

/** The PSIR command centre's live part: progress hero, next topics and
 * the section-by-section map of both papers. */
export function PsirHub() {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const sessionMinutes = useAppStore((state) => state.planner?.sessionMinutes ?? 45);
  const answers = usePracticeStore((state) => state.answers);
  const sources = usePracticeStore((state) => state.sources);
  const thinkerStatus = usePracticeStore((state) => state.thinkers);

  const data = React.useMemo(() => {
    const t = mounted ? topics : {};
    const papers = PSIR_PAPER_IDS.map((id) => ({
      id,
      summary: summarizeProgress(t, id),
    }));
    const all = papers.reduce(
      (acc, paper) => ({
        total: acc.total + paper.summary.total,
        covered: acc.covered + paper.summary.covered,
      }),
      { total: 0, covered: 0 },
    );
    const psirAnswers = Object.values(mounted ? answers : {}).filter(
      (answer) => answer.topicId?.startsWith("mains.psir"),
    );
    return {
      papers,
      all,
      next: nextPsirTopics(t, 3),
      stats: practiceStats(psirAnswers),
      thinkersMastered: Object.values(mounted ? thinkerStatus : {}).filter(
        (status) => status === "mastered",
      ).length,
      booksDone: Object.values(mounted ? sources : {}).filter(
        (status) => status === "done",
      ).length,
    };
  }, [mounted, topics, answers, sources, thinkerStatus]);

  return (
    <div className="space-y-8">
      {/* ---------- Summary (Notion gallery tiles) ---------- */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {data.papers.map((paper, index) => (
          <Link
            key={paper.id}
            href={`/syllabus/${paper.id}`}
            className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/60 lg:col-span-1"
          >
            <ProgressRing
              percent={paper.summary.percent}
              size={52}
              strokeWidth={5}
              label={`${paper.summary.percent}% prepared`}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold group-hover:underline">
                Paper {index === 0 ? "I" : "II"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {mounted ? `${paper.summary.covered}/${paper.summary.total} started` : "…"}
              </span>
            </span>
          </Link>
        ))}
        <StatTile
          emoji="✍️"
          label="PSIR answers"
          value={mounted ? String(data.stats.total) : "…"}
          detail={mounted ? `${data.stats.thisWeek} this week` : ""}
          href="/practice"
        />
        <StatTile
          emoji="💬"
          label="Thinkers mastered"
          value={mounted ? `${data.thinkersMastered}/${THINKERS.length}` : "…"}
          detail="Mark them in the vault"
          href="/psir/thinkers"
        />
        <StatTile
          emoji="📖"
          label="Books finished"
          value={mounted ? `${data.booksDone}/${PSIR_SOURCES.length}` : "…"}
          detail="Track in the booklist"
          href="/psir/books"
        />
      </section>

      {/* ---------- Next up ---------- */}
      <section className="space-y-3">
        <SectionHeading
          title="Next up in PSIR"
          description="Unfinished readings first, then the highest-yield topics — in syllabus order."
        />
        {!mounted ? (
          <Skeleton className="h-28 w-full" />
        ) : data.next.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Every PSIR topic has at least a first reading — shift to
              revision and timed answers.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {data.next.map((id, index) => (
              <NextTopicCard
                key={id}
                topicId={id}
                highlight={index === 0}
                minutes={sessionMinutes}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Paper maps ---------- */}
      {PSIR_PAPERS.map((paper) => (
        <section key={paper.id} className="space-y-3">
          <SectionHeading
            title={`${paper.short} — ${paper.title}`}
            action={
              <Link
                href={`/syllabus/${paper.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                All topics <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {psirSections(paper.id).map((section, index) => (
              <Card key={section.label} className="min-w-0">
                <CardContent className="space-y-0.5 pt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {paper.sections[index].label} · {paper.sections[index].title}
                  </p>
                  {section.units.map((unit) => (
                    <UnitRow key={unit.id} unitId={unit.id} mounted={mounted} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatTile({
  emoji,
  label,
  value,
  detail,
  href,
}: {
  emoji: string;
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-center rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/60"
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden>{emoji}</span> {label}
      </span>
      <span className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground group-hover:underline">{detail}</span>
    </Link>
  );
}

function NextTopicCard({
  topicId,
  highlight,
  minutes,
}: {
  topicId: string;
  highlight: boolean;
  minutes: number;
}) {
  const topic = useAppStore((state) => getTopicState(state.topics, topicId));
  const node = getNode(topicId);
  if (!node) return null;
  const intel = resolveTopicIntel(topicId, topic);
  const priority = PRIORITY_META[intel.priority];

  return (
    <Card
      className={cn(
        "flex flex-col",
        highlight && "border-primary/50 bg-primary/[0.03]",
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-3 pt-5">
        <div className="flex items-center gap-2 text-[11px]">
          {highlight && (
            <span className="tag tag-blue font-medium">
              <Target className="h-3 w-3" /> Start here
            </span>
          )}
          <span className={cn("tag", priority.badge)}>
            {priority.label}
          </span>
          {topic.stage === "first-reading" && (
            <span className="text-muted-foreground">in progress</span>
          )}
        </div>
        <Link
          href={`/syllabus/${topicId}`}
          className="text-[15px] font-semibold leading-snug hover:underline"
        >
          {node.title}
        </Link>
        <p className="text-xs text-muted-foreground">{psirTopicLabel(topicId)}</p>
        <div className="mt-auto flex gap-2 pt-1">
          <StartFocusButton topicId={topicId} minutes={minutes} variant={highlight ? "default" : "outline"} />
          <Button asChild size="sm" variant="ghost">
            <Link href={`/syllabus/${topicId}`}>
              Open <ChevronRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UnitRow({ unitId, mounted }: { unitId: string; mounted: boolean }) {
  const topics = useAppStore((state) => state.topics);
  const node = getNode(unitId);
  if (!node) return null;
  const summary = summarizeProgress(mounted ? topics : {}, unitId);
  // A unit's curated priority = what a (hypothetical) child topic inherits.
  const priority = PRIORITY_META[resolveTopicIntel(`${unitId}.*`).priority];

  return (
    <Link
      href={`/syllabus/${unitId}`}
      className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/60"
    >
      <span
        aria-hidden
        title={`${priority.label} priority`}
        className={cn("h-2 w-2 shrink-0 rounded-full", priority.dot)}
      />
      <span className="min-w-0 flex-1 truncate text-sm group-hover:underline">
        {node.title}
      </span>
      <span className="flex w-28 shrink-0 items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <span
            className="block h-full rounded-full bg-success transition-all"
            style={{ width: `${summary.percent}%` }}
          />
        </span>
        <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
          {summary.covered}/{summary.total}
        </span>
      </span>
    </Link>
  );
}
