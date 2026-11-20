import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Sprite } from "@/components/ui/Sprite";
import { getAdminSession } from "@/lib/auth";

/**
 * Everything under /admin (except the login page) sits behind this gate.
 *
 * The session lives in a cookie, which is request-time data — so the check
 * runs inside <Suspense> and streams in, as Cache Components requires.
 * This gate only decides what to *show*: every admin API route re-checks the
 * session itself before touching any data.
 */
async function Gate({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminShell user={session.user}>{children}</AdminShell>;
}

function Unlocking() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="flex flex-col items-center gap-5 text-center">
        <Sprite name="lock" size={48} className="bob" />
        <p className="font-pixel text-[0.6875rem] text-snow-300">Unlocking the control room…</p>
      </div>
    </div>
  );
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Unlocking />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
