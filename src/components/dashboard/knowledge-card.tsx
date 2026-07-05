"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, Layers } from "lucide-react";

import { knowledgeStats } from "@/lib/knowledge/insights";
import { subjectDistribution } from "@/lib/planner/analytics";
import { getNode } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** The knowledge base at a glance: growth, due cards, latest notes. */
export function KnowledgeCard() {
  const mounted = useMounted();
  const richNotes = useKnowledgeStore((state) => state.richNotes);
  const quickNotes = useKnowledgeStore((state) => state.quickNotes);
  const flashcards = useKnowledgeStore((state) => state.flashcards);
  const keywords = useKnowledgeStore((state) => state.keywords);
  const bookRefs = useKnowledgeStore((state) => state.bookRefs);
  const resources = useKnowledgeStore((state) => state.resources);
  const pyqs = useKnowledgeStore((state) => state.pyqs);
  const currentAffairs = useKnowledgeStore((state) => state.currentAffairs);
  const bookmarks = useKnowledgeStore((state) => state.bookmarks);
  const tasksMap = useAppStore((state) => state.tasks);

  const data = React.useMemo(() => {
    if (!mounted) return null;
    const stats = knowledgeStats({
      richNotes,
      quickNotes,
      flashcards,
      keywords,
      bookRefs,
      resources,
      pyqs,
      currentAffairs,
      bookmarks,
    });
    const recentNotes = Object.values(richNotes)
      .filter((note) => note.markdown.trim() !== "")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);
    const topSubject = subjectDistribution(Object.values(tasksMap))[0] ?? null;
    return { stats, recentNotes, topSubject };
  }, [
    mounted,
    richNotes,
    quickNotes,
    flashcards,
    keywords,
    bookRefs,
    resources,
    pyqs,
    currentAffairs,
    bookmarks,
    tasksMap,
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <BookMarked className="h-4 w-4" /> Knowledge base
          </span>
          {data && data.stats.totalItems > 0 && (
            <span className="text-xs font-normal tabular-nums">
              {data.stats.totalItems} items
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : data.stats.totalItems === 0 ? (
          <p className="text-sm text-muted-foreground">
            Open any topic and start collecting notes, flashcards, keywords
            and PYQs — everything lands here and in Ctrl+K search.
          </p>
        ) : (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              <Stat
                label="Notes"
                value={`${data.stats.notes}`}
                detail={`${data.stats.words.toLocaleString()} words · ~${data.stats.readMinutes} min`}
              />
              <Stat
                label="Flashcards"
                value={`${data.stats.cards}`}
                detail={
                  data.stats.dueCards > 0
                    ? `${data.stats.dueCards} due`
                    : "all fresh"
                }
              />
              <Stat
                label="PYQs"
                value={`${data.stats.pyqs}`}
                detail={`${data.stats.solvedPyqs} solved`}
              />
              <Stat label="Keywords" value={`${data.stats.keywords}`} />
              <Stat label="Current affairs" value={`${data.stats.affairs}`} />
              <Stat
                label="Resources & books"
                value={`${data.stats.resources + data.stats.books}`}
              />
            </dl>

            {data.stats.dueCards > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Layers className="h-3.5 w-3.5" /> {data.stats.dueCards}{" "}
                flashcard{data.stats.dueCards === 1 ? "" : "s"} due — open
                their topics to review.
              </p>
            )}

            {data.recentNotes.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Recently edited notes
                </p>
                <ul className="space-y-0.5">
                  {data.recentNotes.map((note) => (
                    <li key={note.topicId}>
                      <Link
                        href={`/syllabus/${note.topicId}`}
                        className="inline-flex items-center gap-1 text-sm hover:text-primary"
                      >
                        {getNode(note.topicId)?.title ?? note.topicId}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.topSubject && (
              <p className="text-xs text-muted-foreground">
                Most studied so far: {data.topSubject.paper} (
                {Math.round((data.topSubject.minutes / 60) * 10) / 10}h).
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">
        {value}
        {detail && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {detail}
          </span>
        )}
      </dd>
    </div>
  );
}
