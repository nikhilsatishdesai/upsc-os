"use client";

import * as React from "react";
import { Dices, PenLine, Search } from "lucide-react";

import { PSIR_QUESTIONS } from "@/data/psir/questions";
import type { PracticeQuestion } from "@/data/psir/types";
import { answerFormat } from "@/data/psir/exam";
import { getChildren, getNode } from "@/lib/syllabus";
import { psirTopicLabel } from "@/lib/psir";
import { ANSWER_MARKS, type AnswerMarks } from "@/lib/practice/types";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { TopicPicker } from "@/components/knowledge/topic-picker";
import { cn } from "@/lib/utils";

export type StartInput = {
  questionId: string | null;
  question: string;
  topicId: string | null;
  marks: AnswerMarks;
};

const UNITS = [
  ...getChildren("mains.psir1").map((unit) => ({ id: unit.id, label: `P-I · ${unit.title}` })),
  ...getChildren("mains.psir2").map((unit) => ({ id: unit.id, label: `P-II · ${unit.title}` })),
];

/** Pick a bank question (filtered, random) or type your own. */
export function QuestionBank({
  initialTopic,
  onStart,
}: {
  initialTopic: string | null;
  onStart: (input: StartInput) => void;
}) {
  const mounted = useMounted();
  const answers = usePracticeStore((state) => state.answers);
  const [tab, setTab] = React.useState<"bank" | "custom">("bank");
  const [scope, setScope] = React.useState<string>(initialTopic ?? "");
  const [marks, setMarks] = React.useState<"" | AnswerMarks>("");
  const [query, setQuery] = React.useState("");
  const [freshOnly, setFreshOnly] = React.useState(false);

  const [seenTopic, setSeenTopic] = React.useState(initialTopic);
  if (seenTopic !== initialTopic) {
    setSeenTopic(initialTopic);
    if (initialTopic) setScope(initialTopic);
  }

  const attempts = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!mounted) return map;
    for (const answer of Object.values(answers)) {
      if (answer.questionId) map.set(answer.questionId, (map.get(answer.questionId) ?? 0) + 1);
    }
    return map;
  }, [answers, mounted]);

  const q = query.trim().toLowerCase();
  const filtered = PSIR_QUESTIONS.filter((question) => {
    if (scope && !(question.topicId === scope || question.topicId.startsWith(scope + "."))) {
      return false;
    }
    if (marks && question.marks !== marks) return false;
    if (freshOnly && attempts.has(question.id)) return false;
    if (q && !question.text.toLowerCase().includes(q)) return false;
    return true;
  });

  const start = (question: PracticeQuestion) =>
    onStart({
      questionId: question.id,
      question: question.text,
      topicId: question.topicId,
      marks: question.marks,
    });

  const random = () => {
    const pool = filtered.filter((question) => !attempts.has(question.id));
    const from = pool.length > 0 ? pool : filtered;
    if (from.length > 0) start(from[Math.floor(Math.random() * from.length)]);
  };

  return (
    <section className="space-y-3">
      <div className="flex gap-1 border-b">
        {(["bank", "custom"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-2 pb-2 pt-1 text-sm font-medium transition-colors",
              tab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {key === "bank" ? `📚 PSIR question bank (${PSIR_QUESTIONS.length})` : "✏️ My own question"}
          </button>
        ))}
      </div>

      {tab === "bank" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions…"
                className="h-8 pl-8"
                aria-label="Search questions"
              />
            </div>
            <NativeSelect
              aria-label="Unit"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="h-8 w-full text-xs sm:w-64"
            >
              <option value="">All PSIR units</option>
              <option value="mains.psir1">Paper I only</option>
              <option value="mains.psir2">Paper II only</option>
              {UNITS.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
              {scope && !UNITS.some((u) => u.id === scope) && !/^mains\.psir[12]$/.test(scope) && (
                <option value={scope}>Topic: {getNode(scope)?.title.slice(0, 48)}</option>
              )}
            </NativeSelect>
            <NativeSelect
              aria-label="Marks"
              value={String(marks)}
              onChange={(e) => setMarks(e.target.value === "" ? "" : (Number(e.target.value) as AnswerMarks))}
              className="h-8 w-28 text-xs"
            >
              <option value="">Any marks</option>
              {ANSWER_MARKS.map((value) => (
                <option key={value} value={value}>
                  {value} marks
                </option>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={freshOnly}
                onChange={(e) => setFreshOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--primary)]"
              />
              Not yet written
            </label>
            <Button size="sm" variant="outline" className="ml-auto" onClick={random} disabled={filtered.length === 0}>
              <Dices /> Surprise me
            </Button>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-[13px] text-muted-foreground">
                  <th className="w-16 py-2 pr-3 font-normal">Marks</th>
                  <th className="border-l px-3 py-2 font-normal">
                    <span className="font-serif italic">Aa</span> Question
                  </th>
                  <th className="w-24 border-l px-3 py-2 font-normal">Written</th>
                  <th className="w-24 border-l px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 60).map((question) => {
                  const count = attempts.get(question.id) ?? 0;
                  return (
                    <tr key={question.id} className="group border-b align-top hover:bg-secondary/40">
                      <td className="py-2.5 pr-3">
                        <span className="tag tag-gray font-semibold tabular-nums">{question.marks}M</span>
                      </td>
                      <td className="border-l px-3 py-2.5">
                        <p className="leading-snug">{question.text}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {psirTopicLabel(question.topicId)}
                        </p>
                      </td>
                      <td className="border-l px-3 py-2.5">
                        {count > 0 ? (
                          <span className="tag tag-green">×{count}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="border-l px-3 py-2.5 text-right">
                        <Button size="sm" variant={count > 0 ? "ghost" : "outline"} onClick={() => start(question)}>
                          <PenLine /> Write
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              {filtered.length > 60 ? `Showing 60 of ${filtered.length}. Narrow the filters to see more. ` : `${filtered.length} question${filtered.length === 1 ? "" : "s"}. `}
              UPSC-style practice prompts — not reproduced previous-year papers.
            </p>
          </div>
        </div>
      ) : (
        <CustomQuestionForm onStart={onStart} />
      )}
    </section>
  );
}

function CustomQuestionForm({ onStart }: { onStart: (input: StartInput) => void }) {
  const [text, setText] = React.useState("");
  const [marks, setMarks] = React.useState<AnswerMarks>(15);
  const [topicId, setTopicId] = React.useState<string | null>(null);
  const format = answerFormat(marks);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim() === "") return;
        onStart({ questionId: null, question: text.trim(), topicId, marks });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="custom-q">Question</Label>
        <textarea
          id="custom-q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Paste a PYQ, a test-series question or your own…"
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="custom-marks">Marks</Label>
          <NativeSelect
            id="custom-marks"
            value={String(marks)}
            onChange={(e) => setMarks(Number(e.target.value) as AnswerMarks)}
          >
            {ANSWER_MARKS.map((value) => (
              <option key={value} value={value}>
                {value} marks · ≈{answerFormat(value).words} words · {answerFormat(value).minutes} min
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Syllabus topic (optional — any paper)</Label>
          {topicId ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="tag tag-blue max-w-full"><span className="truncate">{getNode(topicId)?.title}</span></span>
              <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setTopicId(null)}>
                change
              </button>
            </div>
          ) : (
            <TopicPicker exclude={[]} onPick={setTopicId} placeholder="Search a topic to link…" />
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Target ≈ {format.words} words in {format.minutes} minutes. Linking a topic
        lets Chanakya ground its review in your notes for that topic.
      </p>
      <Button type="submit" disabled={text.trim() === ""}>
        <PenLine /> Start writing
      </Button>
    </form>
  );
}
