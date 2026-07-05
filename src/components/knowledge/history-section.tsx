"use client";

import * as React from "react";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  FileQuestion,
  History,
  Layers,
  Library,
  Newspaper,
  NotebookPen,
  RotateCw,
  Tags,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  topicStudyHistory,
  topicTimeline,
  type TimelineEntry,
} from "@/lib/knowledge/insights";
import { getTopicState } from "@/lib/stages";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";

const TYPE_ICONS: Record<TimelineEntry["type"], LucideIcon> = {
  studied: CheckCircle2,
  revised: RotateCw,
  "note-updated": NotebookPen,
  "quick-note-added": Zap,
  "flashcard-added": Layers,
  "flashcard-reviewed": Layers,
  "keyword-added": Tags,
  "book-added": BookOpen,
  "resource-added": Library,
  "pyq-added": FileQuestion,
  "pyq-solved": FileQuestion,
  "current-affair-linked": Newspaper,
  "bookmark-added": Bookmark,
};

const TYPE_LABELS: Record<TimelineEntry["type"], string> = {
  studied: "Studied",
  revised: "Revised",
  "note-updated": "Notes",
  "quick-note-added": "Quick note",
  "flashcard-added": "New card",
  "flashcard-reviewed": "Card review",
  "keyword-added": "Keyword",
  "book-added": "Book",
  "resource-added": "Resource",
  "pyq-added": "PYQ",
  "pyq-solved": "PYQ solved",
  "current-affair-linked": "Current affairs",
  "bookmark-added": "Bookmarked",
};

/** Derived study history + the topic's learning timeline. */
export function HistorySection({ topicId }: { topicId: string }) {
  const topics = useAppStore((state) => state.topics);
  const tasksMap = useAppStore((state) => state.tasks);
  const events = useKnowledgeStore((state) => state.events);
  const flashcards = useKnowledgeStore((state) => state.flashcards);
  const pyqs = useKnowledgeStore((state) => state.pyqs);
  const bookmarks = useKnowledgeStore((state) => state.bookmarks);
  const richNotes = useKnowledgeStore((state) => state.richNotes);

  const { rows, timeline } = React.useMemo(() => {
    const tasks = Object.values(tasksMap);
    const topicState = getTopicState(topics, topicId);
    return {
      rows: topicStudyHistory({
        tasks,
        events,
        topicId,
        lastStudiedAt: topicState.lastStudiedAt,
        revisionCount: topicState.revisionCount,
        completedSessions: topicState.completedSessions,
        flashcards,
        pyqsSolved: Object.values(pyqs).filter(
          (pyq) => pyq.topicId === topicId && pyq.solved,
        ).length,
        bookmarkCount: Object.values(bookmarks).filter(
          (bookmark) => bookmark.topicId === topicId,
        ).length,
        noteUpdatedAt: richNotes[topicId]?.updatedAt ?? null,
      }),
      timeline: topicTimeline(topicId, events, tasks),
    };
  }, [tasksMap, topics, events, flashcards, pyqs, bookmarks, richNotes, topicId]);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      {timeline.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Every study session, note, card and question will appear here as
          your learning history.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l pl-4">
          {timeline.map((entry, index) => {
            const Icon = TYPE_ICONS[entry.type] ?? History;
            return (
              <li key={`${entry.at}-${index}`} className="relative pb-3 last:pb-0">
                <span className="absolute -left-[1.32rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-card">
                  <Icon className="h-2.5 w-2.5 text-primary" />
                </span>
                <p className="text-xs">
                  <span className="font-medium">{TYPE_LABELS[entry.type]}</span>
                  {entry.label && (
                    <span className="text-muted-foreground"> — {entry.label}</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(entry.at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
