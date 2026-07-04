import type { Metadata } from "next";

import { Greeting } from "@/components/dashboard/greeting";
import { CountdownCard } from "@/components/dashboard/countdown-card";
import { OverallProgressCard } from "@/components/dashboard/overall-progress-card";
import { PapersCard } from "@/components/dashboard/papers-card";
import { RecentTopicsCard } from "@/components/dashboard/recent-topics-card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Greeting />

      <div className="grid gap-4 md:grid-cols-2">
        <CountdownCard />
        <OverallProgressCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PapersCard />
        <RecentTopicsCard />
      </div>
    </div>
  );
}
