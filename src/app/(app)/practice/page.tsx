import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PracticeStudio } from "@/components/practice/practice-studio";

export const metadata: Metadata = { title: "Answer Writing" };

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        emoji="✍️"
        title="Answer Writing"
        description="Write under exam conditions — a timer sized to the marks, a live word target, an honest self-evaluation rubric and an optional examiner review from Chanakya."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PracticeStudio />
      </Suspense>
    </div>
  );
}
