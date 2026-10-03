import Link from "next/link";
import { ArrowUpRight, Clock, FileText, Lightbulb, Link2, ListChecks } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import {
  ANSWER_FORMATS,
  ANSWER_FRAMEWORK,
  PSIR_PATTERN,
  PSIR_STRATEGY,
} from "@/data/psir/exam";
import { PSIR_SYNERGY } from "@/data/psir/synergy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/layout/page-header";
import { ToggleBlock } from "@/components/ui/toggle-block";

/** The static "how to score" half of the PSIR command centre. */
export function PsirGuide() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeading
          title="Exam pattern"
          description="Know the shape of the paper before you plan answers."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PSIR_PATTERN.facts.map((fact) => (
            <Card key={fact.label}>
              <CardContent className="pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {fact.label}
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{fact.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {fact.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" /> Time & word budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Marks</th>
                    <th className="px-3 py-2 text-left font-medium">Words</th>
                    <th className="px-3 py-2 text-left font-medium">Minutes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ANSWER_FORMATS.map((format) => (
                    <tr key={format.marks}>
                      <td className="px-3 py-2 font-semibold tabular-nums">{format.marks}</td>
                      <td className="px-3 py-2 tabular-nums">≈ {format.words}</td>
                      <td className="px-3 py-2 tabular-nums">{format.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {ANSWER_FORMATS.map((format) => (
                <li key={format.marks}>
                  <span className="font-medium text-foreground">{format.marks}M:</span>{" "}
                  {format.shape}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Based on 180 minutes for 250 marks (≈0.72 min/mark). The word
              limit printed on the paper always wins.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListChecks className="h-4 w-4 text-primary" /> The PSIR answer framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-2">
              {ANSWER_FRAMEWORK.map((item, index) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.step}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <ToggleBlock
        emoji="🧭"
        title="Strategy that moves the score"
        description="seven habits behind a 280+ PSIR score"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {PSIR_STRATEGY.map((tip) => (
            <Card key={tip.title}>
              <CardContent className="flex gap-3 pt-5">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">{tip.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {tip.detail}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ToggleBlock>

      <ToggleBlock
        emoji="🔗"
        title="PSIR ↔ GS synergy map"
        description="study once, bank twice in GS, Essay and Prelims"
      >
        <Card>
          <CardContent className="divide-y p-0">
            {PSIR_SYNERGY.map((link) => {
              const unit = getNode(link.psirId);
              if (!unit) return null;
              return (
                <div
                  key={link.psirId}
                  className="grid gap-2 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-6"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/syllabus/${link.psirId}`}
                      className="flex items-center gap-1.5 text-sm font-medium hover:text-primary"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {link.psirId.startsWith("mains.psir1") ? "P-I" : "P-II"} · {unit.title}
                      </span>
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{link.note}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-1.5">
                    <Link2 className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {link.targets.map((target) => {
                      const node = getNode(target);
                      if (!node) return null;
                      return (
                        <Link
                          key={target}
                          href={`/syllabus/${target}`}
                          className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {node.title.length > 44 ? `${node.title.slice(0, 42)}…` : node.title}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </ToggleBlock>
    </div>
  );
}
