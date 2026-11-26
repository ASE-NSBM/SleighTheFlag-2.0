"use client";

import { useState } from "react";
import { PixelAvatar, TeamCrest } from "@/components/ui/PixelAvatar";
import { Sprite } from "@/components/ui/Sprite";
import { useToast } from "@/components/ui/Toast";
import { event } from "@/config/event";
import { formatStamp, timeAgo } from "@/lib/format";
import type { Team, TeamStatus } from "@/lib/types";
import { formatPhone, isPersonalEmail } from "@/lib/validation";
import { useAdminData } from "./AdminData";
import { StatusChip, useNow } from "./bits";
import { useDialog } from "./useDialog";

interface TeamDrawerProps {
  team: Team;
  onClose(): void;
  onEdit(team: Team): void;
  onDelete(team: Team): void;
}

const NEXT_ACTIONS: Record<TeamStatus, { to: TeamStatus; label: string; style: string; icon: "check" | "close" | "dots" }[]> = {
  pending: [
    { to: "approved", label: "Approve", style: "px-btn-pine", icon: "check" },
    { to: "rejected", label: "Reject", style: "px-btn-danger", icon: "close" },
  ],
  approved: [
    { to: "pending", label: "Back to pending", style: "px-btn-ghost", icon: "dots" },
    { to: "rejected", label: "Reject", style: "px-btn-danger", icon: "close" },
  ],
  rejected: [
    { to: "approved", label: "Approve", style: "px-btn-pine", icon: "check" },
    { to: "pending", label: "Back to pending", style: "px-btn-ghost", icon: "dots" },
  ],
};

/** Everything about one team, with the actions an organiser needs close at hand. */
export function TeamDrawer({ team, onClose, onEdit, onDelete }: TeamDrawerProps) {
  const { setStatus, saveNotes } = useAdminData();
  const toast = useToast();
  const now = useNow();
  const ref = useDialog<HTMLDivElement>(onClose);
  const [notes, setNotes] = useState(team.notes);
  const [savingNotes, setSavingNotes] = useState(false);

  const emails = team.members.map((member) => member.email);
  const leader = team.members[0];

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", body: what, sprite: "scroll" });
    } catch {
      toast({ title: "Copy failed", body: "Your browser blocked clipboard access.", tone: "error" });
    }
  };

  const subject = encodeURIComponent(`${event.fullName} — ${team.name} (${team.code})`);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="drawer outline-none">
        <header className="flex items-start gap-4 border-b-[3px] border-black px-6 py-5">
          <span className="shrink-0 shadow-[0_0_0_3px_#04060f,0_0_0_6px_var(--color-gold-600)]">
            <TeamCrest seed={team.name} size={56} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="drawer-title" className="adm-h1 break-words !text-[0.9375rem]">
              {team.name}
            </h2>
            <p className="mt-1 truncate text-snow-300">{team.university}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusChip status={team.status} />
              <button type="button" className="data bg-night-950 px-2 py-1 text-[0.875rem] text-gold-300 shadow-[0_0_0_2px_var(--color-night-600)] hover:text-white" onClick={() => copy(team.code, `Registration code ${team.code}`)}>
                {team.code}
                <span className="sr-only"> — copy registration code</span>
              </button>
            </div>
          </div>
          <button type="button" className="px-btn px-btn-ghost px-btn-icon shrink-0" onClick={onClose} aria-label="Close details" data-autofocus>
            <Sprite name="close" size={12} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <section aria-label="Review">
            <div className="flex flex-wrap gap-4">
              {NEXT_ACTIONS[team.status].map((action) => (
                <button key={action.to} type="button" className={`px-btn ${action.style}`} onClick={() => void setStatus([team.id], action.to)}>
                  <Sprite name={action.icon} size={12} />
                  {action.label}
                </button>
              ))}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-[0.9375rem]">
              <div>
                <dt className="stat-label !mt-0">Registered</dt>
                <dd className="mt-1 text-snow-100">
                  {formatStamp(team.createdAt)}
                  {now !== null && <span className="text-snow-400"> · {timeAgo(team.createdAt, now)}</span>}
                </dd>
              </div>
              <div>
                <dt className="stat-label !mt-0">Added through</dt>
                <dd className="mt-1 text-snow-100">{team.source === "admin" ? "Organiser entry" : "Public form"}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="drawer-party">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 id="drawer-party" className="kicker">
                <Sprite name="party" size={16} />
                Party · {team.members.length}
              </h3>
              <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={() => copy(emails.join(", "), `${emails.length} email addresses`)}>
                <Sprite name="copy" size={12} />
                Copy emails
              </button>
            </div>
            <ul className="list-none space-y-4 p-0">
              {team.members.map((member) => (
                <li key={member.id} className="flex gap-4 bg-night-950/55 p-4 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.45)]">
                  <span className="h-12 shrink-0 shadow-[0_0_0_3px_#04060f]">
                    <PixelAvatar seed={member.fullName} size={48} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-snow-50">
                      <span className="break-words">{member.fullName}</span>
                      {member.isLeader && <span className="px-chip px-chip-gold">Leader</span>}
                    </p>
                    <dl className="data mt-2 space-y-1 text-snow-300">
                      <div className="flex gap-2">
                        <dt className="sr-only">Student ID</dt>
                        <dd className="flex items-center gap-2">
                          <Sprite name="idcard" size={12} className="shrink-0 text-snow-500" />
                          {member.studentId}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="sr-only">Email</dt>
                        <dd className="flex min-w-0 items-center gap-2">
                          <Sprite name="mail" size={12} className="shrink-0 text-snow-500" />
                          <a className="truncate text-ice-300 underline underline-offset-4 hover:text-white" href={`mailto:${member.email}?subject=${subject}`}>
                            {member.email}
                          </a>
                          {isPersonalEmail(member.email) && (
                            <span className="px-chip px-chip-gold shrink-0" title="Not a university email — check the student ID">
                              Personal
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="sr-only">Contact number</dt>
                        <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Sprite name="phone" size={12} className="shrink-0 text-snow-500" />
                          <a className="text-ice-300 underline underline-offset-4 hover:text-white" href={`tel:${member.phone}`}>
                            {formatPhone(member.phone)}
                          </a>
                          <a
                            className="text-pine-300 underline underline-offset-4 hover:text-white"
                            href={`https://wa.me/${member.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            WhatsApp<span className="sr-only"> {member.fullName} (opens in a new tab)</span>
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
            {leader && (
              <a className="px-btn px-btn-ghost px-btn-sm mt-5" href={`mailto:${leader.email}?cc=${encodeURIComponent(emails.slice(1).join(","))}&subject=${subject}`}>
                <Sprite name="mail" size={12} />
                Email the whole team
              </a>
            )}
          </section>

          <section aria-labelledby="drawer-notes">
            <label id="drawer-notes" htmlFor="drawer-notes-input" className="kicker mb-4 flex">
              <Sprite name="scroll" size={16} />
              Organiser notes
            </label>
            <textarea
              id="drawer-notes-input"
              className="px-input"
              rows={3}
              maxLength={2000}
              placeholder="ID checked, payment received, follow-ups… only organisers see this."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="px-btn px-btn-pine px-btn-sm"
                disabled={savingNotes || notes === team.notes}
                onClick={async () => {
                  setSavingNotes(true);
                  await saveNotes(team.id, notes);
                  setSavingNotes(false);
                }}
              >
                {savingNotes ? "Saving…" : notes === team.notes ? "Saved" : "Save note"}
              </button>
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-black px-6 py-4">
          <button type="button" className="px-btn px-btn-danger" onClick={() => onDelete(team)}>
            <Sprite name="trash" size={12} />
            Delete
          </button>
          <button type="button" className="px-btn px-btn-ice" onClick={() => onEdit(team)}>
            <Sprite name="edit" size={12} />
            Edit team
          </button>
        </footer>
      </div>
    </>
  );
}
