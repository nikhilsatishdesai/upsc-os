"use client";

import * as React from "react";
import { ChevronDown, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DIFFICULTY_META, type Difficulty } from "@/lib/stages";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { BookmarkMenu } from "@/components/knowledge/bookmark-menu";

const PAPERS = [
  "Prelims GS",
  "CSAT",
  "Essay",
  "GS-I",
  "GS-II",
  "GS-III",
  "GS-IV",
];

/** Previous-year questions attached to this topic. */
export function PyqsSection({ topicId }: { topicId: string }) {
  const pyqs = useKnowledgeStore((state) => state.pyqs);
  const addPyq = useKnowledgeStore((state) => state.addPyq);

  const [year, setYear] = React.useState(String(new Date().getFullYear() - 1));
  const [paper, setPaper] = React.useState(PAPERS[0]);
  const [question, setQuestion] = React.useState("");
  const [marks, setMarks] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("medium");

  const items = React.useMemo(
    () =>
      Object.values(pyqs)
        .filter(
          (pyq) =>
            pyq.topicId === topicId || pyq.linkedTopicIds.includes(topicId),
        )
        .sort((a, b) => b.year - a.year || a.createdAt.localeCompare(b.createdAt)),
    [pyqs, topicId],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const numericYear = Number(year);
    if (question.trim() === "" || !Number.isFinite(numericYear)) return;
    addPyq(topicId, {
      year: Math.round(numericYear),
      paper,
      question: question.trim(),
      marks: marks.trim() === "" ? null : Number(marks),
      difficulty,
    });
    setQuestion("");
    setMarks("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2 rounded-lg border bg-secondary/20 p-3">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="The question, as asked by UPSC"
        />
        <div className="flex flex-wrap gap-2">
          <Input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            type="number"
            min={1979}
            max={2100}
            aria-label="Year"
            className="w-24"
          />
          <NativeSelect
            aria-label="Paper"
            value={paper}
            onChange={(event) => setPaper(event.target.value)}
            className="w-32"
          >
            {PAPERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
          <Input
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            type="number"
            min={1}
            max={250}
            placeholder="Marks"
            aria-label="Marks"
            className="w-24"
          />
          <NativeSelect
            aria-label="Difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            className="w-28"
          >
            {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="sm" disabled={question.trim() === ""}>
            <Plus /> Add PYQ
          </Button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Questions UPSC has actually asked from this topic — the best
          predictor of what it will ask next.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((pyq) => (
            <PyqRow key={pyq.id} pyqId={pyq.id} topicId={topicId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PyqRow({ pyqId, topicId }: { pyqId: string; topicId: string }) {
  const pyq = useKnowledgeStore((state) => state.pyqs[pyqId]);
  const updatePyq = useKnowledgeStore((state) => state.updatePyq);
  const removePyq = useKnowledgeStore((state) => state.removePyq);
  const [open, setOpen] = React.useState(false);

  if (!pyq) return null;

  return (
    <li className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-start gap-2.5 px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <p>{pyq.question}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {pyq.year} · {pyq.paper}
            {pyq.marks !== null && ` · ${pyq.marks} marks`} ·{" "}
            {DIFFICULTY_META[pyq.difficulty].label}
            {pyq.solved
              ? " · solved"
              : pyq.attempted
                ? " · attempted"
                : ""}
          </p>
        </div>
        <BookmarkMenu
          targetType="pyq"
          targetId={pyq.id}
          topicId={topicId}
          label="this question"
        />
        <button
          type="button"
          aria-label="Show answer and notes"
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          aria-label="Delete question"
          onClick={() => removePyq(pyq.id)}
          className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t px-3 py-2.5">
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={pyq.attempted}
                onChange={(event) =>
                  updatePyq(pyq.id, { attempted: event.target.checked })
                }
                className="accent-primary"
              />
              Attempted
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={pyq.solved}
                onChange={(event) =>
                  updatePyq(pyq.id, { solved: event.target.checked })
                }
                className="accent-primary"
              />
              Solved
            </label>
          </div>
          <textarea
            defaultValue={pyq.expectedAnswer}
            onBlur={(event) =>
              updatePyq(pyq.id, { expectedAnswer: event.target.value })
            }
            placeholder="Expected answer / points to cover…"
            className="min-h-16 w-full resize-y rounded-md border bg-card p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <textarea
            defaultValue={pyq.note}
            onBlur={(event) => updatePyq(pyq.id, { note: event.target.value })}
            placeholder="Personal notes on this question…"
            className="min-h-12 w-full resize-y rounded-md border bg-card p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
    </li>
  );
}
