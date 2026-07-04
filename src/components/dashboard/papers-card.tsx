"use client";

import Link from "next/link";

import { getStages } from "@/lib/syllabus";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PapersCard() {
  const stages = getStages();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Progress by paper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {stages.map(({ stage, papers }) => (
          <div key={stage.id}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stage.title}
            </p>
            <ul className="space-y-2.5">
              {papers.map((paper) => (
                <li key={paper.id}>
                  <Link
                    href={`/syllabus/${paper.id}`}
                    className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
                  >
                    <span className="truncate text-sm group-hover:text-primary">
                      {paper.title}
                    </span>
                    <SubtreeProgress
                      nodeId={paper.id}
                      className="w-32 sm:w-full"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
