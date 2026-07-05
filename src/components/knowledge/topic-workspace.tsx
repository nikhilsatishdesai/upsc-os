"use client";

import * as React from "react";
import {
  BookOpen,
  Layers,
  Library,
  NotebookPen,
  Tags,
  Zap,
} from "lucide-react";

import { useKnowledgeStore } from "@/store/knowledge-store";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeSection } from "@/components/knowledge/knowledge-section";
import { RichNoteEditor } from "@/components/knowledge/rich-note-editor";
import { QuickNotes } from "@/components/knowledge/quick-notes";
import { FlashcardsSection } from "@/components/knowledge/flashcards-section";
import { KeywordsSection } from "@/components/knowledge/keywords-section";
import { BooksSection } from "@/components/knowledge/books-section";
import { ResourcesSection } from "@/components/knowledge/resources-section";

function countBy<T extends { topicId: string }>(
  map: Record<string, T>,
  topicId: string,
): number {
  return Object.values(map).filter((item) => item.topicId === topicId).length;
}

/**
 * The topic's learning workspace: everything you know about one syllabus
 * point, in collapsible sections. The planner decides WHAT to study; this
 * is WHERE it gets studied.
 */
export function TopicWorkspace({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const hasNote = useKnowledgeStore((state) => !!state.richNotes[topicId]);
  const quickNotes = useKnowledgeStore((state) => state.quickNotes);
  const flashcards = useKnowledgeStore((state) => state.flashcards);
  const keywords = useKnowledgeStore((state) => state.keywords);
  const bookRefs = useKnowledgeStore((state) => state.bookRefs);
  const resources = useKnowledgeStore((state) => state.resources);

  const counts = React.useMemo(
    () => ({
      quick: countBy(quickNotes, topicId),
      cards: countBy(flashcards, topicId),
      keywords: countBy(keywords, topicId),
      books: countBy(bookRefs, topicId),
      resources: countBy(resources, topicId),
    }),
    [quickNotes, flashcards, keywords, bookRefs, resources, topicId],
  );

  if (!mounted) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <KnowledgeSection
        title="Notes"
        icon={NotebookPen}
        defaultOpen={hasNote}
      >
        <RichNoteEditor topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Quick Notes" icon={Zap} count={counts.quick}>
        <QuickNotes topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Flashcards" icon={Layers} count={counts.cards}>
        <FlashcardsSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Keywords" icon={Tags} count={counts.keywords}>
        <KeywordsSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection
        title="Book References"
        icon={BookOpen}
        count={counts.books}
      >
        <BooksSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection
        title="Resources"
        icon={Library}
        count={counts.resources}
      >
        <ResourcesSection topicId={topicId} />
      </KnowledgeSection>
    </div>
  );
}
