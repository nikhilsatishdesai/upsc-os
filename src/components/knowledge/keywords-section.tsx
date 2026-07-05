"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { KEYWORD_KINDS, type KeywordKind } from "@/lib/knowledge/types";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/** Articles, committees, schemes, acts, cases… the exam's currency. */
export function KeywordsSection({ topicId }: { topicId: string }) {
  const keywords = useKnowledgeStore((state) => state.keywords);
  const addKeyword = useKnowledgeStore((state) => state.addKeyword);
  const removeKeyword = useKnowledgeStore((state) => state.removeKeyword);

  const [term, setTerm] = React.useState("");
  const [kind, setKind] = React.useState<KeywordKind>("concept");

  const topicKeywords = React.useMemo(
    () =>
      Object.values(keywords)
        .filter((keyword) => keyword.topicId === topicId)
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.term.localeCompare(b.term)),
    [keywords, topicId],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (term.trim() === "") return;
    addKeyword(topicId, term.trim(), kind);
    setTerm("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <NativeSelect
          aria-label="Keyword type"
          value={kind}
          onChange={(event) => setKind(event.target.value as KeywordKind)}
          className="w-32"
        >
          {KEYWORD_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="e.g. Article 21 · Sarkaria Commission · Kesavananda Bharati"
          className="min-w-48 flex-1"
        />
        <Button type="submit" size="sm" disabled={term.trim() === ""}>
          <Plus /> Add
        </Button>
      </form>

      {topicKeywords.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The terms an examiner expects to see — all searchable via Ctrl+K.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {topicKeywords.map((keyword) => (
            <span
              key={keyword.id}
              className="group inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-1.5 text-xs shadow-sm"
            >
              <span className="font-medium">{keyword.term}</span>
              <span className="text-[10px] text-muted-foreground">
                {KEYWORD_KINDS.find((k) => k.value === keyword.kind)?.label}
              </span>
              <button
                type="button"
                aria-label={`Remove keyword ${keyword.term}`}
                onClick={() => removeKeyword(keyword.id)}
                className="rounded-full p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
