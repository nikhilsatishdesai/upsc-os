import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TOTAL_LEAF_TOPICS } from "@/lib/syllabus";
import { PageHeader, SectionHeading } from "@/components/layout/page-header";
import { PaperCard, StageLegend } from "@/components/syllabus/paper-card";

export const metadata: Metadata = { title: "Syllabus" };

const GROUPS: {
  title: string;
  description: string;
  papers: { id: string; badge?: string }[];
  action?: { href: string; label: string };
}[] = [
  {
    title: "Preliminary Examination",
    description:
      "Objective screening stage — Paper I decides the cut-off; CSAT is qualifying at 33%.",
    papers: [{ id: "prelims.gs" }, { id: "prelims.csat", badge: "Qualifying" }],
  },
  {
    title: "Mains — Essay & General Studies",
    description: "1,250 marks of descriptive papers that decide your rank with the optional.",
    papers: [
      { id: "mains.essay" },
      { id: "mains.gs1" },
      { id: "mains.gs2" },
      { id: "mains.gs3" },
      { id: "mains.gs4" },
    ],
  },
  {
    title: "Mains — Optional: Political Science & IR",
    description: "500 marks across two papers — the single biggest block of the written exam.",
    papers: [
      { id: "mains.psir1", badge: "Optional" },
      { id: "mains.psir2", badge: "Optional" },
    ],
    action: { href: "/psir", label: "Open the PSIR command centre" },
  },
  {
    title: "Mains — Qualifying Language Papers",
    description: "25% to qualify; marks are not counted for ranking.",
    papers: [{ id: "mains.languages", badge: "Qualifying" }],
  },
];

export default function SyllabusPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        cover="parchment"
        emoji="📚"
        title="Syllabus"
        description={`The complete UPSC CSE syllabus as ${TOTAL_LEAF_TOPICS} trackable topics. Open a paper, then any topic to take notes, add flashcards and PYQs, and set its study stage.`}
        actions={<StageLegend />}
      />

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-4">
          <SectionHeading
            title={group.title}
            description={group.description}
            action={
              group.action && (
                <Link
                  href={group.action.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {group.action.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.papers.map((paper) => (
              <PaperCard key={paper.id} paperId={paper.id} badge={paper.badge} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
