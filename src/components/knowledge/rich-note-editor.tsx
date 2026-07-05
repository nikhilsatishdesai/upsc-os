"use client";

import * as React from "react";
import {
  Bold,
  Code,
  Heading2,
  Image,
  Italic,
  Lightbulb,
  Link,
  List,
  ListChecks,
  Quote,
  Table,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  applySnippet,
  countWords,
  readingMinutes,
  type MarkdownSnippetKind,
} from "@/lib/knowledge/notes";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { MarkdownPreview } from "@/components/knowledge/markdown-preview";

const AUTOSAVE_MS = 800;

const TOOLBAR: { kind: MarkdownSnippetKind; icon: LucideIcon; label: string }[] = [
  { kind: "heading", icon: Heading2, label: "Heading" },
  { kind: "bold", icon: Bold, label: "Bold" },
  { kind: "italic", icon: Italic, label: "Italic" },
  { kind: "list", icon: List, label: "Bullet list" },
  { kind: "checklist", icon: ListChecks, label: "Checklist" },
  { kind: "table", icon: Table, label: "Table" },
  { kind: "code", icon: Code, label: "Code block" },
  { kind: "quote", icon: Quote, label: "Quote" },
  { kind: "callout", icon: Lightbulb, label: "Callout box" },
  { kind: "link", icon: Link, label: "Link" },
  { kind: "image", icon: Image, label: "Image" },
];

/** The topic's rich markdown note: Write/Preview, toolbar, auto-save. */
export function RichNoteEditor({ topicId }: { topicId: string }) {
  const note = useKnowledgeStore((state) => state.richNotes[topicId]);
  const saveRichNote = useKnowledgeStore((state) => state.saveRichNote);

  const savedMarkdown = note?.markdown ?? "";
  const [draft, setDraft] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"write" | "preview">("write");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const value = draft ?? savedMarkdown;
  const dirty = draft !== null && draft !== savedMarkdown;

  // Debounced auto-save.
  React.useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      saveRichNote(topicId, draft!);
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, draft, topicId, saveRichNote]);

  // Flush unsaved changes when leaving the page/component.
  const pendingRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    pendingRef.current = dirty ? draft : null;
  });
  React.useEffect(
    () => () => {
      if (pendingRef.current !== null) {
        saveRichNote(topicId, pendingRef.current);
      }
    },
    [topicId, saveRichNote],
  );

  const insert = (kind: MarkdownSnippetKind) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const result = applySnippet(value, start, end, kind);
    setDraft(result.text);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const words = countWords(value);
  const savedAt = note
    ? new Date(note.updatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Note mode"
          className="inline-flex rounded-lg border bg-secondary/50 p-0.5"
        >
          {(["write", "preview"] as const).map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={mode === name}
              onClick={() => setMode(name)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                mode === name
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {dirty ? "Saving…" : savedAt ? `Saved · ${savedAt}` : "Auto-saves as you type"}
        </p>
      </div>

      {mode === "write" && (
        <>
          <div className="flex flex-wrap gap-1 rounded-lg border bg-secondary/30 p-1">
            {TOOLBAR.map((tool) => (
              <button
                key={tool.kind}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                onClick={() => insert(tool.kind)}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <tool.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              "Write everything you know about this topic…\n\nMarkdown supported: ## headings, **bold**, tables, - [ ] checklists, ```code```, > [!tip] callouts."
            }
            className="min-h-64 w-full resize-y rounded-lg border bg-card p-3 font-mono text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </>
      )}

      {mode === "preview" && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <MarkdownPreview markdown={value} />
        </div>
      )}

      <p className="text-xs tabular-nums text-muted-foreground">
        {value.length.toLocaleString()} characters · {words.toLocaleString()}{" "}
        words · ~{readingMinutes(words)} min read
        {note && note.versionTimestamps.length > 1 && (
          <> · {note.versionTimestamps.length} saved versions</>
        )}
      </p>
    </div>
  );
}
