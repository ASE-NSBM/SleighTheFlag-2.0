"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";
import { ToastProvider } from "@/components/ui/Toast";
import { event } from "@/config/event";
import { AdminDataProvider, useAdminData } from "./AdminData";

const LINKS: { href: string; label: string; icon: SpriteName }[] = [
  { href: "/admin", label: "Overview", icon: "grid" },
  { href: "/admin/teams", label: "Teams", icon: "list" },
  { href: "/admin/settings", label: "Settings", icon: "sliders" },
];

const REASON = { open: "Registration open", paused: "Registration paused", "not-yet": "Not open yet", deadline: "Deadline passed", full: "Team cap reached" } as const;

function RegistrationBadge() {
  const { status } = useAdminData();
  if (!status) return <span className="skeleton block h-7 w-40" />;
  return (
    <span className={`px-chip ${status.open ? "px-chip-pine" : "px-chip-berry"}`}>
      <Sprite name={status.open ? "check" : "close"} size={12} />
      {REASON[status.reason]}
    </span>
  );
}

function PendingCount() {
  const { teams } = useAdminData();
  const pending = teams.filter((team) => team.status === "pending").length;
  if (pending === 0) return null;
  return (
    <span className="font-pixel ml-auto bg-gold-400 px-1.5 py-1 text-[0.5rem] leading-none text-night-950" aria-label={`${pending} pending`}>
      {pending}
    </span>
  );
}

/** Frame of the control room: navigation, session, and the shared data. */
export function AdminShell({ user, children }: { user: string; children: ReactNode }) {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    setLeaving(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload on purpose: sign-in/out must drop every cached admin screen
      window.location.assign("/admin/login");
    }
  };

  return (
    <ToastProvider>
      <AdminDataProvider>
        <div className="adm-shell">
          <aside className="adm-side">
            <Link href="/admin" className="flex items-center gap-3 no-underline lg:mb-6 lg:px-2">
              <Sprite name="flag" size={32} />
              <span className="font-pixel text-[0.5625rem] leading-[1.7] text-snow-50">
                {event.name} <span className="text-gold-400">{event.edition}</span>
                <span className="hidden text-snow-400 lg:block">Control room</span>
              </span>
            </Link>

            <nav aria-label="Admin" className="ml-auto flex gap-1 lg:ml-0 lg:flex-col lg:gap-1.5">
              {LINKS.map((link) => {
                const current = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href} className="adm-nav" aria-current={current ? "page" : undefined}>
                    <Sprite name={link.icon} size={12} />
                    <span className="hidden sm:inline">{link.label}</span>
                    <span className="sr-only sm:hidden">{link.label}</span>
                    {link.href === "/admin/teams" && <PendingCount />}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden lg:mt-auto lg:block">
              <div className="mb-4 px-2">
                <RegistrationBadge />
              </div>
              <a href="/" target="_blank" rel="noopener noreferrer" className="adm-nav">
                <Sprite name="link" size={12} />
                View site
              </a>
              <div className="mt-3 flex items-center justify-between gap-3 border-t-[3px] border-night-700 px-2 pt-4">
                <span className="flex min-w-0 items-center gap-2 text-[0.9375rem] text-snow-300">
                  <Sprite name="user" size={12} />
                  <span className="truncate">{user}</span>
                </span>
                <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={logout} disabled={leaving}>
                  <Sprite name="logout" size={12} />
                  {leaving ? "…" : "Sign out"}
                </button>
              </div>
            </div>

            <button type="button" className="px-btn px-btn-ghost px-btn-icon lg:hidden" onClick={logout} disabled={leaving} aria-label="Sign out">
              <Sprite name="logout" size={12} />
            </button>
          </aside>

          <main className="adm-main" id="main">
            {children}
          </main>
        </div>
      </AdminDataProvider>
    </ToastProvider>
  );
}
