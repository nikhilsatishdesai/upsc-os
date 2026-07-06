"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookText,
  Check,
  FileText,
  GraduationCap,
  Layers,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";

import type { FlashcardDraft, QuizQuestion } from "@/lib/ai/structured";
import { parseQuiz } from "@/lib/ai/structured";
import { aiConfigured, useAiStore } from "@/store/ai-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useMounted } from "@/hooks/use-mounted";
import { useAiService } from "@/components/ai/use-ai-service";
import { friendlyAiError } from "@/components/ai/ai-error";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { ProviderIndicator } from "@/components/ai/provider-indicator";
import { Button } from "@/components/ui/button";

type ToolId =
  | "summary"
  | "explanation"
  | "improve"
  | "simplify"
  | "mnemonics"
  | "flashcards"
  | "quiz";

const TOOLS: { id: ToolId; label: string; icon: typeof Sparkles }[] = [
  { id: "summary", label: "Summarize", icon: FileText },
  { id: "explanation", label: "Explain topic", icon: GraduationCap },
  { id: "improve", label: "Improve notes", icon: Wand2 },
  { id: "simplify", label: "Simplify notes", icon: BookText },
  { id: "mnemonics", label: "Mnemonics", icon: Lightbulb },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "quiz", label: "Quiz me", icon: GraduationCap },
];

/**
 * Embedded AI for one topic: summaries, explanations, note improvement and
 * simplification, mnemonics, flashcard and quiz generation — all grounded
 * in the student's own material via the context builder, all routed
 * through the AI service. Persisted results live in the note's `ai` slots.
 */
export function AiTopicTools({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const service = useAiService();
  const configured = useAiStore((state) => aiConfigured(state.providers));
  const note = useKnowledgeStore((state) => state.richNotes[topicId]);
  const setNoteAi = useKnowledgeStore((state) => state.setNoteAi);
  const saveRichNote = useKnowledgeStore((state) => state.saveRichNote);
  const addFlashcard = useKnowledgeStore((state) => state.addFlashcard);
  const addQuickNote = useKnowledgeStore((state) => state.addQuickNote);

  const [active, setActive] = React.useState<ToolId | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [text, setText] = React.useState<string>("");
  const [drafts, setDrafts] = React.useState<FlashcardDraft[] | null>(null);
  const [quiz, setQuiz] = React.useState<QuizQuestion[] | null>(null);

  const persistedSummary = note?.ai.summary ?? null;
  const persistedExplanation = note?.ai.explanation ?? null;
  const persistedImprove = note?.ai.cleanup ?? null;

  const reset = () => {
    setError(null);
    setText("");
    setDrafts(null);
    setQuiz(null);
  };

  async function run(tool: ToolId, regenerate = false) {
    setActive(tool);
    reset();

    // Show persisted output instantly (no spend) unless regenerating.
    if (!regenerate) {
      if (tool === "summary" && persistedSummary) return setText(persistedSummary);
      if (tool === "explanation" && persistedExplanation)
        return setText(persistedExplanation);
      if (tool === "improve" && persistedImprove) return setText(persistedImprove);
      if (tool === "quiz" && note?.ai.quiz) {
        const cached = parseQuiz(note.ai.quiz);
        if (cached.length > 0) return setQuiz(cached);
      }
    }

    setBusy(true);
    try {
      if (tool === "summary") {
        const output = await service.summarizeTopic(topicId, regenerate);
        setText(output);
        setNoteAi(topicId, { summary: output });
      } else if (tool === "explanation") {
        const output = await service.explainTopic(topicId);
        setText(output);
        setNoteAi(topicId, { explanation: output });
      } else if (tool === "improve") {
        const output = await service.improveNotes(topicId);
        setText(output);
        setNoteAi(topicId, { cleanup: output });
      } else if (tool === "simplify") {
        setText(await service.simplifyNotes(topicId, note?.markdown ?? ""));
      } else if (tool === "mnemonics") {
        setText(await service.mnemonics(topicId, regenerate));
      } else if (tool === "flashcards") {
        setDrafts(await service.generateFlashcards(topicId, 8));
      } else if (tool === "quiz") {
        const questions = await service.generateQuiz(topicId, 5, "medium");
        setQuiz(questions);
        if (questions.length > 0)
          setNoteAi(topicId, { quiz: JSON.stringify({ questions }) });
      }
    } catch (caught) {
      setError(friendlyAiError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  if (!configured) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>
          Connect an AI provider in{" "}
          <Link href="/settings" className="text-primary hover:underline">
            Settings → AI
          </Link>{" "}
          to summarize notes, generate flashcards and quizzes, and more — all
          from your own material.
        </span>
      </div>
    );
  }

  const hasNote = (note?.markdown ?? "").trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Generated from your notes, keywords and PYQs on this topic.
        </p>
        <ProviderIndicator capability="summary" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TOOLS.map((tool) => {
          const disabled =
            busy || ((tool.id === "simplify") && !hasNote);
          return (
            <Button
              key={tool.id}
              variant={active === tool.id ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => run(tool.id)}
              title={
                tool.id === "simplify" && !hasNote
                  ? "Write some notes first"
                  : undefined
              }
            >
              <tool.icon /> {tool.label}
            </Button>
          );
        })}
      </div>

      {active && (
        <div className="rounded-lg border bg-secondary/20 p-4">
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Working from your
              material…
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : drafts ? (
            <FlashcardDrafts
              drafts={drafts}
              onAdd={(selected) => {
                for (const card of selected) addFlashcard(topicId, card);
                setDrafts(null);
                setActive(null);
              }}
              onRegenerate={() => run("flashcards", true)}
            />
          ) : quiz ? (
            <QuizRunner quiz={quiz} onRegenerate={() => run("quiz", true)} />
          ) : (
            <ResultView
              tool={active}
              text={text}
              onRegenerate={() => run(active, true)}
              onReplaceNote={
                active === "simplify"
                  ? () => {
                      saveRichNote(topicId, text);
                      setActive(null);
                    }
                  : undefined
              }
              onSaveQuickNote={
                active === "mnemonics"
                  ? () => {
                      addQuickNote(topicId, text, "mnemonic");
                      setActive(null);
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResultView({
  tool,
  text,
  onRegenerate,
  onReplaceNote,
  onSaveQuickNote,
}: {
  tool: ToolId;
  text: string;
  onRegenerate: () => void;
  onReplaceNote?: () => void;
  onSaveQuickNote?: () => void;
}) {
  if (text.trim() === "") {
    return <p className="text-sm text-muted-foreground">No output produced.</p>;
  }
  return (
    <div className="space-y-3">
      <AiMarkdown content={text} />
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw /> Regenerate
        </Button>
        {onReplaceNote && (
          <Button variant="outline" size="sm" onClick={onReplaceNote}>
            <Check /> Replace my note
          </Button>
        )}
        {onSaveQuickNote && (
          <Button variant="outline" size="sm" onClick={onSaveQuickNote}>
            <Check /> Save as quick note
          </Button>
        )}
        {(tool === "summary" ||
          tool === "explanation" ||
          tool === "improve") && (
          <span className="self-center text-xs text-muted-foreground">
            Saved to this topic&apos;s AI notes.
          </span>
        )}
      </div>
    </div>
  );
}

function FlashcardDrafts({
  drafts,
  onAdd,
  onRegenerate,
}: {
  drafts: FlashcardDraft[];
  onAdd: (selected: FlashcardDraft[]) => void;
  onRegenerate: () => void;
}) {
  const [selected, setSelected] = React.useState<Set<number>>(
    new Set(drafts.map((_, index) => index)),
  );

  if (drafts.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t draft new cards — you may already have cards covering
          this, or the notes are thin.
        </p>
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  const toggle = (index: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {drafts.length} proposed flashcards — review, then add the ones you want.
      </p>
      <ul className="space-y-2">
        {drafts.map((card, index) => (
          <li
            key={index}
            className="flex items-start gap-2 rounded-md border bg-card p-2.5"
          >
            <input
              type="checkbox"
              className="mt-1 accent-primary"
              checked={selected.has(index)}
              onChange={() => toggle(index)}
            />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{card.front}</p>
              <p className="text-muted-foreground">{card.back}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t pt-3">
        <Button
          size="sm"
          disabled={selected.size === 0}
          onClick={() => onAdd(drafts.filter((_, index) => selected.has(index)))}
        >
          <Check /> Add {selected.size} card{selected.size === 1 ? "" : "s"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw /> Regenerate
        </Button>
      </div>
    </div>
  );
}

function QuizRunner({
  quiz,
  onRegenerate,
}: {
  quiz: QuizQuestion[];
  onRegenerate: () => void;
}) {
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [revealed, setRevealed] = React.useState(false);

  if (quiz.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t build a quiz from this topic&apos;s material yet.
        </p>
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  const score = quiz.reduce(
    (sum, question, index) =>
      answers[index] === question.answerIndex ? sum + 1 : sum,
    0,
  );

  return (
    <div className="space-y-4">
      {quiz.map((question, qIndex) => (
        <div key={qIndex} className="space-y-2">
          <p className="text-sm font-medium">
            {qIndex + 1}. {question.question}
          </p>
          <div className="grid gap-1.5">
            {question.options.map((option, oIndex) => {
              const chosen = answers[qIndex] === oIndex;
              const correct = question.answerIndex === oIndex;
              return (
                <button
                  key={oIndex}
                  type="button"
                  disabled={revealed}
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [qIndex]: oIndex }))
                  }
                  className={[
                    "rounded-md border px-3 py-1.5 text-left text-sm transition-colors",
                    revealed && correct
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : revealed && chosen && !correct
                        ? "border-red-500/50 bg-red-500/10"
                        : chosen
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-secondary",
                  ].join(" ")}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {revealed && question.explanation && (
            <p className="text-xs text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {!revealed ? (
          <Button
            size="sm"
            disabled={Object.keys(answers).length < quiz.length}
            onClick={() => setRevealed(true)}
          >
            Check answers
          </Button>
        ) : (
          <span className="text-sm font-medium">
            Score: {score}/{quiz.length}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw /> New quiz
        </Button>
      </div>
    </div>
  );
}
