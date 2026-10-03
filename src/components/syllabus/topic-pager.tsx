import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getAdjacentLeaves } from "@/lib/syllabus";

/** Previous / next topic in reading order — study straight through a paper. */
export function TopicPager({ topicId }: { topicId: string }) {
  const { prev, next, position, total } = getAdjacentLeaves(topicId);
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Topic navigation"
      className="grid gap-3 border-t pt-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
    >
      {prev ? (
        <Link
          href={`/syllabus/${prev.id}`}
          className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 shadow-soft transition-colors hover:border-primary/40"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary" />
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
              Previous
            </span>
            <span className="block truncate text-sm font-medium">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      <span className="order-first text-center text-xs tabular-nums text-muted-foreground sm:order-none">
        Topic {position} of {total} in this paper
      </span>
      {next ? (
        <Link
          href={`/syllabus/${next.id}`}
          className="group flex min-w-0 items-center justify-end gap-3 rounded-xl border bg-card p-3 text-right shadow-soft transition-colors hover:border-primary/40"
        >
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
              Next
            </span>
            <span className="block truncate text-sm font-medium">{next.title}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
    </nav>
  );
}
