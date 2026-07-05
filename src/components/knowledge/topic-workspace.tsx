"use client";

import * as React from "react";
import { NotebookPen, Zap } from "lucide-react";

import { useKnowledgeStore } from "@/store/knowledge-store";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeSection } from "@/components/knowledge/knowledge-section";
import { RichNoteEditor } from "@/components/knowledge/rich-note-editor";
import { QuickNotes } from "@/components/knowledge/quick-notes";

/**
 * The topic's learning workspace: everything you know about one syllabus
 * point, in collapsible sections. The planner decides WHAT to study; this
 * is WHERE it gets studied.
 */
export function TopicWorkspace({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const hasNote = useKnowledgeStore((state) => !!state.richNotes[topicId]);
  const quickNotes = useKnowledgeStore((state) => state.quickNotes);

  const quickCount = React.useMemo(
    () =>
      Object.values(quickNotes).filter((note) => note.topicId === topicId)
        .length,
    [quickNotes, topicId],
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

      <KnowledgeSection title="Quick Notes" icon={Zap} count={quickCount}>
        <QuickNotes topicId={topicId} />
      </KnowledgeSection>
    </div>
  );
}
