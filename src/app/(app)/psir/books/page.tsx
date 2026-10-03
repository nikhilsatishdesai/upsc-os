import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PsirNav } from "@/components/psir/psir-nav";
import { Booklist } from "@/components/psir/booklist";

export const metadata: Metadata = { title: "Booklist · PSIR" };

export default function BooksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📖"
        title="PSIR booklist"
        description="The standard sources for every section of both papers — tiered from foundation to depth — with your reading status."
      />
      <PsirNav />
      <Booklist />
    </div>
  );
}
