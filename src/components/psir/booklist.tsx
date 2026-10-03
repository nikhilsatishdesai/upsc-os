"use client";

import Link from "next/link";

import { getNode } from "@/lib/syllabus";
import { PSIR_SOURCES, SOURCE_TIER_META } from "@/data/psir/sources";
import type { StudySource } from "@/data/psir/types";
import type { SourceStatus } from "@/lib/practice/types";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { psirSectionOf } from "@/lib/psir";
import { cn } from "@/lib/utils";

const GROUPS = [
  { key: "p1a", label: "Paper I · Section A — Political Theory & Thought", paper: "mains.psir1", section: "A" },
  { key: "p1b", label: "Paper I · Section B — Indian Government & Politics", paper: "mains.psir1", section: "B" },
  { key: "p2a", label: "Paper II · Section A — Comparative & International Politics", paper: "mains.psir2", section: "A" },
  { key: "p2b", label: "Paper II · Section B — India & the World", paper: "mains.psir2", section: "B" },
] as const;

/** Each source sits in the group of the first unit it covers. */
function groupOf(source: StudySource): string {
  const first = source.coversIds[0];
  const paper = first.startsWith("mains.psir2") ? "p2" : "p1";
  return `${paper}${psirSectionOf(first) === "A" ? "a" : "b"}`;
}

/** The PSIR booklist as a database table with per-book reading status. */
export function Booklist() {
  const mounted = useMounted();
  const statuses = usePracticeStore((state) => state.sources);
  const setStatus = usePracticeStore((state) => state.setSourceStatus);
  const statusOf = (id: string) => (mounted ? statuses[id] : undefined);

  const done = PSIR_SOURCES.filter((source) => statusOf(source.id) === "done").length;
  const reading = PSIR_SOURCES.filter((source) => statusOf(source.id) === "reading").length;

  return (
    <div className="space-y-8">
      <div className="callout text-sm">
        <span aria-hidden className="text-lg leading-6">📌</span>
        <div className="leading-relaxed">
          <p>
            <span className="font-medium">{done}</span> finished ·{" "}
            <span className="font-medium">{reading}</span> reading ·{" "}
            {PSIR_SOURCES.length - done - reading} to go.
          </p>
          <p className="text-muted-foreground">
            Start with <span className="tag tag-blue">Foundation</span>, make notes
            from <span className="tag tag-purple">Core</span>, dip into{" "}
            <span className="tag tag-gray">Depth</span> for 15/20-markers, and keep{" "}
            <span className="tag tag-yellow">Current</span> running weekly for Paper II
            Section B. Fewer books, revised more often, beats more books.
          </p>
        </div>
      </div>

      {GROUPS.map((group) => {
        const sources = PSIR_SOURCES.filter((source) => groupOf(source) === group.key);
        if (sources.length === 0) return null;
        return (
          <section key={group.key} className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">{group.label}</h2>
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-[13px] text-muted-foreground">
                    <th className="py-2 pr-3 font-normal">
                      <span className="font-serif italic">Aa</span> Book
                    </th>
                    <th className="w-24 border-l px-3 py-2 font-normal">Tier</th>
                    <th className="border-l px-3 py-2 font-normal">Covers</th>
                    <th className="w-32 border-l px-3 py-2 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <SourceRow
                      key={source.id}
                      source={source}
                      status={statusOf(source.id)}
                      onStatus={(status) => setStatus(source.id, status)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SourceRow({
  source,
  status,
  onStatus,
}: {
  source: StudySource;
  status: SourceStatus | undefined;
  onStatus: (status: SourceStatus | null) => void;
}) {
  return (
    <tr className="border-b align-top transition-colors hover:bg-secondary/40">
      <td className="py-2.5 pr-3">
        <p className={cn("font-medium", status === "done" && "text-muted-foreground line-through")}>
          📘 {source.title}
        </p>
        <p className="text-xs text-muted-foreground">{source.author}</p>
        <p className="mt-1 text-xs text-muted-foreground">{source.note}</p>
      </td>
      <td className="border-l px-3 py-2.5">
        <span className={cn("tag", SOURCE_TIER_META[source.tier].badge)}>
          {SOURCE_TIER_META[source.tier].label}
        </span>
      </td>
      <td className="border-l px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {source.coversIds.map((id) => {
            const node = getNode(id);
            if (!node) return null;
            return (
              <Link key={id} href={`/syllabus/${id}`} className="tag tag-gray hover:opacity-80">
                {node.title.split(" · ")[0]}
              </Link>
            );
          })}
        </div>
      </td>
      <td className="border-l px-3 py-2.5">
        <select
          aria-label={`${source.title} reading status`}
          value={status ?? ""}
          onChange={(e) =>
            onStatus(e.target.value === "" ? null : (e.target.value as SourceStatus))
          }
          className={cn(
            "tag cursor-pointer appearance-none pr-2 outline-none",
            status === "done" ? "tag-green" : status === "reading" ? "tag-yellow" : "tag-gray",
          )}
        >
          <option value="">Not started</option>
          <option value="reading">Reading</option>
          <option value="done">Done</option>
        </select>
      </td>
    </tr>
  );
}
