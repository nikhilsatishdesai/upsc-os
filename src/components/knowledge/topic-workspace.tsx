"use client";

import * as React from "react";
import {
  BookOpen,
  FileQuestion,
  History,
  Layers,
  Library,
  Newspaper,
  NotebookPen,
  Sparkles,
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
import { PyqsSection } from "@/components/knowledge/pyqs-section";
import { CurrentAffairsSection } from "@/components/knowledge/current-affairs-section";
import { HistorySection } from "@/components/knowledge/history-section";
import { AiTopicTools } from "@/components/knowledge/ai-topic-tools";

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
  const pyqs = useKnowledgeStore((state) => state.pyqs);
  const currentAffairs = useKnowledgeStore((state) => state.currentAffairs);

  const counts = React.useMemo(
    () => ({
      quick: countBy(quickNotes, topicId),
      cards: countBy(flashcards, topicId),
      keywords: countBy(keywords, topicId),
      books: countBy(bookRefs, topicId),
      resources: countBy(resources, topicId),
      pyqs: Object.values(pyqs).filter(
        (pyq) =>
          pyq.topicId === topicId || pyq.linkedTopicIds.includes(topicId),
      ).length,
      affairs: Object.values(currentAffairs).filter((affair) =>
        affair.topicIds.includes(topicId),
      ).length,
    }),
    [
      quickNotes,
      flashcards,
      keywords,
      bookRefs,
      resources,
      pyqs,
      currentAffairs,
      topicId,
    ],
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
    <div className="space-y-0.5">
      <KnowledgeSection
        title="Notes"
        icon={NotebookPen}
        description="Your main markdown notes — tables, checklists, callouts"
        defaultOpen={hasNote}
      >
        <RichNoteEditor topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Quick Notes" icon={Zap} count={counts.quick} description="Mnemonics, tricks and one-line reminders">
        <QuickNotes topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Flashcards" icon={Layers} count={counts.cards} description="Active recall cards with a review mode">
        <FlashcardsSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Keywords" icon={Tags} count={counts.keywords} description="Articles, cases, thinkers, committees to drop into answers">
        <KeywordsSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection
        title="Book References"
        icon={BookOpen}
        description="Which chapter of which book covers this"
        count={counts.books}
      >
        <BooksSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection
        title="Resources"
        icon={Library}
        description="Links to PDFs, videos and articles"
        count={counts.resources}
      >
        <ResourcesSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection
        title="Previous Year Questions"
        icon={FileQuestion}
        description="Real UPSC questions on this topic, with your attempts"
        count={counts.pyqs}
      >
        <PyqsSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection
        title="Current Affairs"
        icon={Newspaper}
        description="News that makes this topic exam-relevant now"
        count={counts.affairs}
      >
        <CurrentAffairsSection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Study History & Timeline" icon={History} description="Every session and edit, in order">
        <HistorySection topicId={topicId} />
      </KnowledgeSection>

      <KnowledgeSection title="Ask Chanakya (AI)" icon={Sparkles} description="Summaries, explanations, quizzes and mnemonics">
        <AiTopicTools topicId={topicId} />
      </KnowledgeSection>
    </div>
  );
}
