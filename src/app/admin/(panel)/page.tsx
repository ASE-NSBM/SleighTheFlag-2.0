import type { Metadata } from "next";
import { Overview } from "@/components/admin/Overview";

export const metadata: Metadata = { title: "Overview · Control room" };

export default function AdminOverviewPage() {
  return <Overview />;
}
