"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Book references: Laxmikanth Ch. 7, NCERT XI p. 45-60, Economic Survey… */
export function BooksSection({ topicId }: { topicId: string }) {
  const bookRefs = useKnowledgeStore((state) => state.bookRefs);
  const addBookRef = useKnowledgeStore((state) => state.addBookRef);
  const updateBookRef = useKnowledgeStore((state) => state.updateBookRef);
  const removeBookRef = useKnowledgeStore((state) => state.removeBookRef);

  const [book, setBook] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const [pages, setPages] = React.useState("");
  const [note, setNote] = React.useState("");

  const refs = React.useMemo(
    () =>
      Object.values(bookRefs)
        .filter((ref) => ref.topicId === topicId)
        .sort((a, b) => a.book.localeCompare(b.book)),
    [bookRefs, topicId],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (book.trim() === "") return;
    addBookRef(topicId, {
      book: book.trim(),
      chapter: chapter.trim(),
      pages: pages.trim(),
      note: note.trim(),
    });
    setBook("");
    setChapter("");
    setPages("");
    setNote("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2 rounded-lg border bg-secondary/20 p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={book}
            onChange={(event) => setBook(event.target.value)}
            placeholder="Book (e.g. Laxmikanth)"
          />
          <Input
            value={chapter}
            onChange={(event) => setChapter(event.target.value)}
            placeholder="Chapter"
          />
          <Input
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="Pages (e.g. 120–135)"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Personal remarks (optional)"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={book.trim() === ""}>
            <Plus /> Add
          </Button>
        </div>
      </form>

      {refs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Where this topic lives in your books — tick references off as you
          finish them.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {refs.map((ref) => (
            <li
              key={ref.id}
              className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm"
            >
              <input
                type="checkbox"
                aria-label={`Mark ${ref.book} as read`}
                checked={ref.completed}
                onChange={(event) =>
                  updateBookRef(ref.id, { completed: event.target.checked })
                }
                className="mt-1 shrink-0 accent-primary"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium",
                    ref.completed && "text-muted-foreground line-through decoration-1",
                  )}
                >
                  {ref.book}
                  {ref.chapter && ` · ${ref.chapter}`}
                  {ref.pages && ` · pp. ${ref.pages}`}
                </p>
                {ref.note && (
                  <p className="text-xs text-muted-foreground">{ref.note}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Delete reference"
                onClick={() => removeBookRef(ref.id)}
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
