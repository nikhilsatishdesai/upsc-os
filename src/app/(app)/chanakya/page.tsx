import type { Metadata } from "next";

import { ChanakyaLoader } from "@/components/chanakya/chanakya-loader";

export const metadata: Metadata = {
  title: "Chanakya",
  description: "Your AI UPSC mentor, planner and strategist.",
};

export default function ChanakyaPage() {
  return <ChanakyaLoader />;
}
