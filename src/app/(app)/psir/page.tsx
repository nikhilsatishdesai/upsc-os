import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, PenLine, Quote } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PsirNav } from "@/components/psir/psir-nav";
import { PsirHub } from "@/components/psir/psir-hub";
import { PsirGuide } from "@/components/psir/psir-guide";

export const metadata: Metadata = { title: "PSIR Optional" };

export default function PsirPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        cover="ocean"
        emoji="🏛️"
        title="PSIR command centre"
        description="Political Science & International Relations — 500 marks. Both papers, every thinker, the booklist and timed answer practice in one place."
        actions={
          <>
            <Button asChild>
              <Link href="/practice">
                <PenLine /> Write a timed answer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/psir/thinkers">
                <Quote /> Thinkers vault
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/psir/books">
                <BookMarked /> Booklist
              </Link>
            </Button>
          </>
        }
      />
      <PsirNav />
      <PsirHub />
      <PsirGuide />
    </div>
  );
}
