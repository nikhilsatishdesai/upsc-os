"use client";

import * as React from "react";
import Link from "next/link";

import { getNode } from "@/lib/syllabus";
import { summarizeProgress } from "@/lib/progress";
import { nextPsirTopics, PSIR_PAPER_IDS } from "@/lib/psir";
import { practiceStats } from "@/lib/practice/answers";
import { useAppStore } from "@/store/app-store";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";

/** PSIR at a glance on the dashboard: both papers, answers, next topic. */
export function PsirCard() {
  const mounted = useMounted();
  const topics = useAppStore((state) => state.topics);
  const answers = usePracticeStore((state) => state.answers);

  const data = React.useMemo(() => {
    if (!mounted) return null;
    const psirAnswers = Object.values(answers).filter((answer) =>
      answer.topicId?.startsWith("mains.psir"),
    );
    return {
      papers: PSIR_PAPER_IDS.map((id) => summarizeProgress(topics, id)),
      stats: practiceStats(psirAnswers),
      next: nextPsirTopics(topics, 1)[0] ?? null,
    };
  }, [mounted, topics, answers]);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-[15px]">🏛️ PSIR optional</CardTitle>
        <Link href="/psir" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Open
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {data.papers.map((summary, index) => (
                <Link
                  key={PSIR_PAPER_IDS[index]}
                  href={`/syllabus/${PSIR_PAPER_IDS[index]}`}
                  className="flex items-center gap-3 rounded-md p-1 hover:bg-secondary/60"
                >
                  <ProgressRing percent={summary.percent} size={48} strokeWidth={5} label={`${summary.percent}% prepared`} />
                  <span>
                    <span className="block text-sm font-medium">Paper {index === 0 ? "I" : "II"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {summary.covered}/{summary.total} started
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              ✍️ {data.stats.thisWeek} answer{data.stats.thisWeek === 1 ? "" : "s"} this week ·{" "}
              {data.stats.total} total
              {data.stats.averagePercent !== null && ` · avg self-score ${data.stats.averagePercent}%`}
            </p>
            {data.next && (
              <Link
                href={`/syllabus/${data.next}`}
                className="block rounded-md border p-3 text-sm transition-colors hover:bg-secondary/60"
              >
                <span className="text-xs text-muted-foreground">Next up</span>
                <span className="block font-medium leading-snug">{getNode(data.next)?.title}</span>
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
