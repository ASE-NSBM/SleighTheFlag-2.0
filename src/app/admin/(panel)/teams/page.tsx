import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamsBoard } from "@/components/admin/TeamsBoard";

export const metadata: Metadata = { title: "Teams · Control room" };

export default function AdminTeamsPage() {
  return (
    // The board reads ?team=… from the URL, which is request-time data.
    <Suspense fallback={<div className="skeleton mx-auto h-[420px] max-w-[1400px]" />}>
      <TeamsBoard />
    </Suspense>
  );
}
