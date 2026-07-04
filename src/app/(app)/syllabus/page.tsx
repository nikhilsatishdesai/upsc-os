import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getStages } from "@/lib/syllabus";
import { SubtreeProgress } from "@/components/syllabus/subtree-progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Syllabus" };

export default function SyllabusPage() {
  const stages = getStages();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Syllabus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The complete UPSC Civil Services syllabus. Open any paper and mark
          topics as you study them.
        </p>
      </div>

      {stages.map(({ stage, papers }) => (
        <section key={stage.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {stage.title}
            </h2>
            {stage.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {stage.description}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {papers.map((paper) => (
              <Link key={paper.id} href={`/syllabus/${paper.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-secondary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2 text-base">
                      <span>{paper.title}</span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardTitle>
                    {paper.description && (
                      <CardDescription className="line-clamp-2">
                        {paper.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <SubtreeProgress nodeId={paper.id} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
