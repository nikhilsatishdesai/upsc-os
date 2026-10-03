import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PsirNav } from "@/components/psir/psir-nav";
import { ThinkersVault } from "@/components/psir/thinkers-vault";
import { THINKERS } from "@/data/psir/thinkers";

export const metadata: Metadata = { title: "Thinkers vault · PSIR" };

export default function ThinkersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        emoji="💬"
        title="Thinkers vault"
        description={`${THINKERS.length} one-page thinker sheets — key works, core ideas, quotable lines, standard critiques and exactly where each one earns marks.`}
      />
      <PsirNav />
      <ThinkersVault />
    </div>
  );
}
