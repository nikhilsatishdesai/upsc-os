"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import {
  QUICK_NOTE_KINDS,
  type QuickNoteKind,
} from "@/lib/knowledge/types";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/** Lightweight one-liners: mnemonics, tricks, hooks, definitions, formulae. */
export function QuickNotes({ topicId }: { topicId: string }) {
  const quickNotes = useKnowledgeStore((state) => state.quickNotes);
  const addQuickNote = useKnowledgeStore((state) => state.addQuickNote);
  const removeQuickNote = useKnowledgeStore((state) => state.removeQuickNote);

  const [text, setText] = React.useState("");
  const [kind, setKind] = React.useState<QuickNoteKind>("reminder");

  const notes = React.useMemo(
    () =>
      Object.values(quickNotes)
        .filter((note) => note.topicId === topicId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [quickNotes, topicId],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed === "") return;
    addQuickNote(topicId, trimmed, kind);
    setText("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <NativeSelect
          aria-label="Quick note type"
          value={kind}
          onChange={(event) => setKind(event.target.value as QuickNoteKind)}
          className="w-36"
        >
          {QUICK_NOTE_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="e.g. “FR suspension: Art 358 only Art 19, Art 359 others”"
          className="min-w-48 flex-1"
        />
        <Button type="submit" size="sm" disabled={text.trim() === ""}>
          <Plus /> Add
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Mnemonics, memory hooks, one-line definitions — the small things
          that win marks.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {QUICK_NOTE_KINDS.find((k) => k.value === note.kind)?.label}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap">
                {note.text}
              </span>
              <button
                type="button"
                aria-label="Delete quick note"
                onClick={() => removeQuickNote(note.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
