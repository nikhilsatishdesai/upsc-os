"use client";

import { MarkdownPreview } from "@/components/knowledge/markdown-preview";

/** Renders AI reply markdown in the app's design language. Reuses the
 * knowledge markdown renderer (callouts, tables, code) so AI output looks
 * identical to the student's own notes. */
export function AiMarkdown({ content }: { content: string }) {
  if (content.trim() === "") {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="inline-flex gap-1">
          <span className="animate-pulse">Thinking</span>
          <span className="animate-pulse">…</span>
        </span>
      </p>
    );
  }
  return <MarkdownPreview markdown={content} />;
}
