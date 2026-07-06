"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Lazy-load the AI workspace so its bundle (service, client, providers)
 * never ships to the rest of the app — it loads only on /chanakya. */
const ChanakyaWorkspace = dynamic(
  () =>
    import("./chanakya-workspace").then((module) => module.ChanakyaWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[70vh] min-h-[520px] w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    ),
  },
);

export function ChanakyaLoader() {
  return <ChanakyaWorkspace />;
}
