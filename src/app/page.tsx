import Link from "next/link";
import {
  Library,
  TrendingUp,
  Search,
  ShieldCheck,
  MoonStar,
  Route,
  ArrowRight,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOTAL_LEAF_TOPICS } from "@/lib/syllabus";

const features = [
  {
    icon: Library,
    title: "The complete syllabus, structured",
    description: `Prelims and Mains broken into ${TOTAL_LEAF_TOPICS} trackable topics — browse it like a map, not a PDF.`,
  },
  {
    icon: TrendingUp,
    title: "Progress you can see",
    description:
      "Mark topics as you study and revise. Every paper rolls up into one honest picture of where you stand.",
  },
  {
    icon: Search,
    title: "Instant search",
    description:
      "Press Ctrl+K and jump to any topic in the entire syllabus in under a second.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description:
      "No account, no sign-up. Everything stays in your browser, with one-click backup whenever you want it.",
  },
  {
    icon: MoonStar,
    title: "Late-night friendly",
    description:
      "A calm, premium interface with full dark mode — built for long study sessions on any device.",
  },
  {
    icon: Route,
    title: "Built for the long road",
    description:
      "Study planner, revision engine, PYQ analysis and an AI mentor are on the roadmap — all on this foundation.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/dashboard">Open app</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 text-center md:px-8 md:pt-24">
          <Badge variant="accent" className="mb-5">
            V1 · Foundation — free, no account needed
          </Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            The operating system for your{" "}
            <span className="text-primary">UPSC preparation</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            One calm, fast place to see the whole syllabus, track every topic
            you study, and stay honest about your progress — from first
            reading to final revision.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Start preparing <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/syllabus">Browse the syllabus</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon
                    aria-hidden
                    className="mb-2 h-5 w-5 text-primary"
                  />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:px-8">
          <span>UPSC OS — built for serious aspirants.</span>
          <span>Your data never leaves your device.</span>
        </div>
      </footer>
    </div>
  );
}
