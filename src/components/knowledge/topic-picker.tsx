"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { getAllNodes, isLeaf, type SyllabusNode } from "@/lib/syllabus";
import { Input } from "@/components/ui/input";

const leaves = getAllNodes().filter(isLeaf);

/** Inline topic search used to link entries to more syllabus topics. */
export function TopicPicker({
  exclude,
  onPick,
  placeholder = "Link another topic…",
}: {
  exclude: string[];
  onPick: (topicId: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as SyllabusNode[];
    return leaves
      .filter(
        (node) =>
          !exclude.includes(node.id) &&
          (node.title.toLowerCase().includes(q) ||
            node.pathTitles.join(" ").toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [query, exclude]);

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
      {focused && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {results.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onPick(node.id);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-secondary"
              >
                <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {node.title}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {node.pathTitles.join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
