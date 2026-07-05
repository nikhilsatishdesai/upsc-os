"use client";

import * as React from "react";
import { Link2, Plus, X } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import type { CurrentAffairImportance } from "@/lib/knowledge/types";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { TopicPicker } from "@/components/knowledge/topic-picker";
import { BookmarkMenu } from "@/components/knowledge/bookmark-menu";

const IMPORTANCE_META: Record<
  CurrentAffairImportance,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  medium: {
    label: "Medium",
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  low: { label: "Low", className: "border-border bg-secondary text-muted-foreground" },
};

/** News items linked to this topic — one article can span many topics. */
export function CurrentAffairsSection({ topicId }: { topicId: string }) {
  const currentAffairs = useKnowledgeStore((state) => state.currentAffairs);
  const addCurrentAffair = useKnowledgeStore((state) => state.addCurrentAffair);
  const updateCurrentAffair = useKnowledgeStore(
    (state) => state.updateCurrentAffair,
  );
  const removeCurrentAffair = useKnowledgeStore(
    (state) => state.removeCurrentAffair,
  );

  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [source, setSource] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [importance, setImportance] =
    React.useState<CurrentAffairImportance>("medium");
  const [extraTopics, setExtraTopics] = React.useState<string[]>([]);

  const items = React.useMemo(
    () =>
      Object.values(currentAffairs)
        .filter((affair) => affair.topicIds.includes(topicId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [currentAffairs, topicId],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    addCurrentAffair({
      title: title.trim(),
      topicIds: [topicId, ...extraTopics],
      date: date || undefined,
      source: source.trim(),
      summary: summary.trim(),
      importance,
    });
    setTitle("");
    setDate("");
    setSource("");
    setSummary("");
    setExtraTopics([]);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2 rounded-lg border bg-secondary/20 p-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Headline (e.g. SC verdict on electoral bonds)"
        />
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Date"
            className="w-40"
          />
          <Input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Source (The Hindu, PIB…)"
            className="min-w-36 flex-1"
          />
          <NativeSelect
            aria-label="Importance"
            value={importance}
            onChange={(event) =>
              setImportance(event.target.value as CurrentAffairImportance)
            }
            className="w-28"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </NativeSelect>
        </div>
        <Input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Why it matters for the exam (one line)"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-48 flex-1">
            <TopicPicker
              exclude={[topicId, ...extraTopics]}
              onPick={(id) => setExtraTopics((current) => [...current, id])}
            />
          </div>
          <Button type="submit" size="sm" disabled={title.trim() === ""}>
            <Plus /> Add
          </Button>
        </div>
        {extraTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {extraTopics.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px]"
              >
                <Link2 className="h-3 w-3 text-muted-foreground" />
                {getNode(id)?.title}
                <button
                  type="button"
                  aria-label="Unlink topic"
                  onClick={() =>
                    setExtraTopics((current) =>
                      current.filter((topic) => topic !== id),
                    )
                  }
                  className="text-muted-foreground/60 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Link the news to the syllabus — that connection is exactly what
          UPSC tests.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((affair) => (
            <li
              key={affair.id}
              className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{affair.title}</p>
                  {affair.summary && (
                    <p className="text-xs text-muted-foreground">
                      {affair.summary}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={IMPORTANCE_META[affair.importance].className}
                    >
                      {IMPORTANCE_META[affair.importance].label}
                    </Badge>
                    <span>
                      {affair.date}
                      {affair.source && ` · ${affair.source}`}
                      {affair.topicIds.length > 1 &&
                        ` · linked to ${affair.topicIds.length} topics`}
                    </span>
                  </div>
                </div>
                <BookmarkMenu
                  targetType="current-affair"
                  targetId={affair.id}
                  topicId={topicId}
                  label="this article"
                />
                <button
                  type="button"
                  aria-label={
                    affair.topicIds.length > 1
                      ? "Unlink from this topic"
                      : "Delete entry"
                  }
                  onClick={() => {
                    if (affair.topicIds.length > 1) {
                      updateCurrentAffair(affair.id, {
                        topicIds: affair.topicIds.filter(
                          (id) => id !== topicId,
                        ),
                      });
                    } else {
                      removeCurrentAffair(affair.id);
                    }
                  }}
                  className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
