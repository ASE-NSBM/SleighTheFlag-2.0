"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PixelAvatar, TeamCrest } from "@/components/ui/PixelAvatar";
import { Sprite } from "@/components/ui/Sprite";
import { formatStamp, plural } from "@/lib/format";
import type { Team, TeamStatus } from "@/lib/types";
import { formatPhone } from "@/lib/validation";
import { useAdminData } from "./AdminData";
import { ConfirmDialog, EmptyState, StatusChip } from "./bits";
import { TeamDrawer } from "./TeamDrawer";
import { TeamForm } from "./TeamForm";

type SortKey = "name" | "university" | "leader" | "members" | "status" | "created";
type Filter = "all" | TeamStatus;

const PAGE = 20;
const STATUS_ORDER: Record<TeamStatus, number> = { pending: 0, approved: 1, rejected: 2 };
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const haystack = (team: Team) =>
  [team.name, team.code, team.university, team.notes, ...team.members.flatMap((m) => [m.fullName, m.studentId, m.email, m.phone, formatPhone(m.phone)])]
    .join(" ")
    .toLowerCase();

function compare(a: Team, b: Team, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "university":
      return a.university.localeCompare(b.university) || a.name.localeCompare(b.name);
    case "leader":
      return (a.members[0]?.fullName ?? "").localeCompare(b.members[0]?.fullName ?? "");
    case "members":
      return a.members.length - b.members.length;
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    default:
      return a.createdAt.localeCompare(b.createdAt);
  }
}

/** The registrations table: search, filter, sort, select, review, edit, export. */
export function TeamsBoard() {
  const { teams, loading, error, refresh, setStatus, removeTeams } = useAdminData();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [university, setUniversity] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created", dir: -1 });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(() => params.get("team"));
  const [form, setForm] = useState<{ team?: Team } | null>(null);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDetailsElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  /* "/" jumps to search, like every tool an organiser already uses. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: teams.length, pending: 0, approved: 0, rejected: 0 };
    for (const team of teams) out[team.status]++;
    return out;
  }, [teams]);

  const universityOptions = useMemo(() => [...new Set(teams.map((team) => team.university))].sort((a, b) => a.localeCompare(b)), [teams]);

  const rows = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = teams.filter((team) => {
      if (filter !== "all" && team.status !== filter) return false;
      if (university !== "all" && team.university !== university) return false;
      if (words.length === 0) return true;
      const text = haystack(team);
      return words.every((word) => text.includes(word));
    });
    return list.sort((a, b) => compare(a, b, sort.key) * sort.dir);
  }, [teams, query, filter, university, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const open = openId ? (teams.find((team) => team.id === openId) ?? null) : null;

  // Selection only ever refers to teams that still exist.
  const chosen = useMemo(() => teams.filter((team) => selected.has(team.id)).map((team) => team.id), [teams, selected]);
  const allOnPage = visible.length > 0 && visible.every((team) => selected.has(team.id));
  const someOnPage = visible.some((team) => selected.has(team.id));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someOnPage && !allOnPage;
  }, [someOnPage, allOnPage]);

  const toggle = (id: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((set) => {
      const next = new Set(set);
      for (const team of visible) {
        if (allOnPage) next.delete(team.id);
        else next.add(team.id);
      }
      return next;
    });

  const sortBy = (key: SortKey) => {
    setSort((value) => (value.key === key ? { key, dir: value.dir === 1 ? -1 : 1 } : { key, dir: key === "created" || key === "members" ? -1 : 1 }));
    setPage(0);
  };

  const exportUrl = (format: string, layout?: string) => {
    const search = new URLSearchParams({ format });
    if (layout) search.set("layout", layout);
    if (chosen.length > 0) search.set("ids", chosen.join(","));
    else if (filter !== "all") search.set("status", filter);
    return `/api/admin/export?${search}`;
  };
  const exportScope = chosen.length > 0 ? `${plural(chosen.length, "selected team")}` : filter === "all" ? "all teams" : `${filter} teams`;

  const header = (key: SortKey, label: string, className = "") => (
    <th scope="col" className={className} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => sortBy(key)}>
        {label}
        {sort.key === key && <Sprite name={sort.dir === 1 ? "chevron-up" : "chevron-down"} size={12} />}
      </button>
    </th>
  );

  const quickActions = (team: Team) => (
    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      {team.status !== "approved" && (
        <button type="button" className="px-btn px-btn-pine px-btn-icon" onClick={() => void setStatus([team.id], "approved")} aria-label={`Approve ${team.name}`} title="Approve">
          <Sprite name="check" size={12} />
        </button>
      )}
      {team.status !== "rejected" && (
        <button type="button" className="px-btn px-btn-ghost px-btn-icon" onClick={() => void setStatus([team.id], "rejected")} aria-label={`Reject ${team.name}`} title="Reject">
          <Sprite name="close" size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] pb-28">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="kicker">
            <Sprite name="list" size={12} />
            Registrations
          </p>
          <h1 className="adm-h1 mt-3">Teams</h1>
          <p className="mt-2 text-snow-300" aria-live="polite">
            {loading ? "Loading…" : rows.length === teams.length ? plural(teams.length, "team") : `${rows.length} of ${plural(teams.length, "team")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <details ref={exportRef} className="relative">
            <summary className="px-btn px-btn-ghost list-none [&::-webkit-details-marker]:hidden">
              <Sprite name="download" size={12} />
              Export
              <Sprite name="chevron-down" size={12} />
            </summary>
            <div className="px-box px-solid absolute right-0 top-[calc(100%+14px)] z-30 w-[300px] p-2">
              <p className="px-3 pb-2 pt-2 text-[0.875rem] text-snow-400">Exporting {exportScope}</p>
              {[
                { href: exportUrl("xlsx"), title: "Excel workbook (.xlsx)", note: "Teams + participants sheets" },
                { href: exportUrl("csv", "teams"), title: "CSV · one row per team", note: "For Google Sheets or scripts" },
                { href: exportUrl("csv", "participants"), title: "CSV · one row per person", note: "Attendance, certificates, mail merge" },
                { href: exportUrl("json"), title: "JSON", note: "For the scoreboard or other tools" },
              ].map((item) => (
                <a key={item.title} href={item.href} download className="block px-3 py-2.5 no-underline hover:bg-white/10" onClick={() => exportRef.current?.removeAttribute("open")}>
                  <span className="block text-snow-50">{item.title}</span>
                  <span className="block text-[0.875rem] text-snow-400">{item.note}</span>
                </a>
              ))}
            </div>
          </details>
          <button type="button" className="px-btn px-btn-pine" onClick={() => setForm({})}>
            <Sprite name="plus" size={12} />
            Add team
          </button>
        </div>
      </header>

      {error && (
        <p className="mt-6 flex items-center justify-between gap-4 bg-berry-800/45 px-4 py-3 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
          <span>{error}</span>
          <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}

      {/* Filters */}
      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="relative min-w-[240px] flex-1">
          <label htmlFor="team-search" className="sr-only">
            Search teams, people, emails, IDs or codes
          </label>
          <Sprite name="search" size={12} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-snow-400" />
          <input
            ref={searchRef}
            id="team-search"
            type="search"
            className="px-input !pl-11"
            placeholder="Search teams, people, emails, IDs, codes…   ( / )"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-3" role="group" aria-label="Filter by status">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => {
                setFilter(item.key);
                setPage(0);
              }}
              className={`px-btn px-btn-sm ${filter === item.key ? "px-btn-gold" : "px-btn-ghost"}`}
            >
              {item.label}
              <span className={filter === item.key ? "text-night-800" : "text-snow-400"}>{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="team-university" className="sr-only">
            Filter by university
          </label>
          <select
            id="team-university"
            className="px-input !w-auto max-w-[260px]"
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All universities</option>
            {universityOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table (tablet and up) */}
      <div className="px-box px-solid mt-7 hidden md:block">
        <div className="tbl-wrap">
          <table className="tbl">
            <caption className="sr-only">Registered teams</caption>
            <thead>
              <tr>
                <th scope="col" className="w-12">
                  <span>
                    <input ref={selectAllRef} type="checkbox" className="px-check !m-0 !h-6 !w-6" checked={allOnPage} onChange={togglePage} aria-label="Select every team on this page" />
                  </span>
                </th>
                {header("name", "Team")}
                {header("university", "University")}
                {header("leader", "Leader", "hidden xl:table-cell")}
                {header("members", "Party", "hidden xl:table-cell")}
                {header("status", "Status")}
                {header("created", "Registered", "hidden min-[1400px]:table-cell")}
                <th scope="col">
                  <span className="justify-end">Review</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                [0, 1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td colSpan={8}>
                      <div className="skeleton h-10" />
                    </td>
                  </tr>
                ))}
              {!loading &&
                visible.map((team) => (
                  <tr
                    key={team.id}
                    tabIndex={0}
                    data-selected={selected.has(team.id)}
                    onClick={() => setOpenId(team.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && event.target === event.currentTarget) setOpenId(team.id);
                    }}
                    aria-label={`${team.name}, ${team.university}, ${team.status}. Open details`}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" className="px-check !m-0 !h-6 !w-6" checked={selected.has(team.id)} onChange={() => toggle(team.id)} aria-label={`Select ${team.name}`} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="shrink-0 shadow-[0_0_0_3px_#04060f]">
                          <TeamCrest seed={team.name} size={36} />
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[150px] truncate text-snow-50">{team.name}</span>
                          <span className="data block text-[0.8125rem] text-snow-400">{team.code}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="block max-w-[168px] truncate text-snow-200">{team.university}</span>
                    </td>
                    <td className="hidden xl:table-cell">
                      <span className="block max-w-[136px] truncate text-snow-100">{team.members[0]?.fullName ?? "—"}</span>
                      <span className="data block text-[0.8125rem] text-snow-400">{team.members[0] ? formatPhone(team.members[0].phone) : ""}</span>
                    </td>
                    <td className="hidden xl:table-cell">
                      <div className="flex items-center gap-3">
                        <span className="flex">
                          {team.members.slice(0, 4).map((member, index) => (
                            <span key={member.id} className="shadow-[0_0_0_2px_#04060f]" style={{ marginLeft: index ? -6 : 0 }}>
                              <PixelAvatar seed={member.fullName} size={24} />
                            </span>
                          ))}
                        </span>
                        <span className="font-pixel text-[0.625rem] text-snow-200">{team.members.length}</span>
                      </div>
                    </td>
                    <td>
                      <StatusChip status={team.status} />
                    </td>
                    <td className="hidden min-[1400px]:table-cell">
                      <span className="whitespace-nowrap text-[0.9375rem] text-snow-200">{formatStamp(team.createdAt)}</span>
                      {team.source === "admin" && <span className="block text-[0.8125rem] text-snow-500">added by organiser</span>}
                    </td>
                    <td>{quickActions(team)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <EmptyState sprite={teams.length === 0 ? "snowflake" : "lens"} title={teams.length === 0 ? "No teams yet" : "Nothing matches"}>
            {teams.length === 0 ? "Share the registration link — teams appear here the moment they sign up. You can also add one by hand." : "Try a different search or clear the filters."}
          </EmptyState>
        )}
      </div>

      {/* Cards (phones) */}
      <ul className="mt-7 list-none space-y-5 p-0 md:hidden">
        {!loading &&
          visible.map((team) => (
            <li key={team.id} className="px-box px-solid p-4" data-selected={selected.has(team.id)}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="px-check !mt-1.5" checked={selected.has(team.id)} onChange={() => toggle(team.id)} aria-label={`Select ${team.name}`} />
                <button type="button" className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left text-inherit" onClick={() => setOpenId(team.id)}>
                  <span className="flex items-center gap-3">
                    <span className="shrink-0 shadow-[0_0_0_3px_#04060f]">
                      <TeamCrest seed={team.name} size={36} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-snow-50">{team.name}</span>
                      <span className="data block text-[0.8125rem] text-snow-400">{team.code}</span>
                    </span>
                  </span>
                  <span className="mt-3 block truncate text-[0.9375rem] text-snow-300">{team.university}</span>
                  <span className="mt-1 block text-[0.9375rem] text-snow-400">
                    {team.members[0]?.fullName} · {plural(team.members.length, "player")} · {formatStamp(team.createdAt)}
                  </span>
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <StatusChip status={team.status} />
                {quickActions(team)}
              </div>
            </li>
          ))}
        {!loading && rows.length === 0 && (
          <li className="px-box px-solid">
            <EmptyState sprite="snowflake" title={teams.length === 0 ? "No teams yet" : "Nothing matches"} />
          </li>
        )}
      </ul>

      {pages > 1 && (
        <nav className="mt-7 flex items-center justify-center gap-5" aria-label="Pages">
          <button type="button" className="px-btn px-btn-ghost px-btn-icon" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
            <Sprite name="chevron-left" size={12} />
          </button>
          <span className="font-pixel text-[0.625rem] text-snow-200">
            Page {current + 1} / {pages}
          </span>
          <button type="button" className="px-btn px-btn-ghost px-btn-icon" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
            <Sprite name="chevron-right" size={12} />
          </button>
        </nav>
      )}

      {/* Bulk actions */}
      {chosen.length > 0 && (
        <div className="pop-in fixed bottom-5 left-1/2 z-50 w-[min(760px,calc(100vw-24px))] -translate-x-1/2" role="region" aria-label="Bulk actions">
          <div className="px-box px-solid flex flex-wrap items-center gap-x-4 gap-y-3 p-3 [--box-border:var(--color-gold-400)]">
            <span className="font-pixel px-2 text-[0.625rem] text-gold-300">{chosen.length} selected</span>
            <div className="ml-auto flex flex-wrap gap-3">
              <button type="button" className="px-btn px-btn-pine px-btn-sm" onClick={() => void setStatus(chosen, "approved")}>
                <Sprite name="check" size={12} />
                Approve
              </button>
              <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={() => void setStatus(chosen, "pending")}>
                Pending
              </button>
              <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={() => void setStatus(chosen, "rejected")}>
                <Sprite name="close" size={12} />
                Reject
              </button>
              <a className="px-btn px-btn-ghost px-btn-sm" href={exportUrl("xlsx")} download>
                <Sprite name="download" size={12} />
                Export
              </a>
              <button type="button" className="px-btn px-btn-danger px-btn-sm" onClick={() => setConfirm(chosen)}>
                <Sprite name="trash" size={12} />
                Delete
              </button>
              <button type="button" className="px-btn px-btn-ghost px-btn-icon" onClick={() => setSelected(new Set())} aria-label="Clear selection">
                <Sprite name="close" size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {open && !form && (
        <TeamDrawer key={open.id} team={open} onClose={() => setOpenId(null)} onEdit={(team) => setForm({ team })} onDelete={(team) => setConfirm([team.id])} />
      )}

      {form && (
        <TeamForm
          key={form.team?.id ?? "new"}
          team={form.team}
          onClose={() => setForm(null)}
          onSaved={(team) => {
            setForm(null);
            setOpenId(team.id);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.length === 1 ? `Delete ${teams.find((team) => team.id === confirm[0])?.name ?? "this team"}?` : `Delete ${confirm.length} teams?`}
          body={
            <p>
              {confirm.length === 1 ? "The team and all of its members" : "These teams and all of their members"} will be removed permanently. This can&apos;t be undone — export first if you
              might need the data.
            </p>
          }
          confirmLabel={confirm.length === 1 ? "Delete team" : `Delete ${confirm.length} teams`}
          busy={deleting}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setDeleting(true);
            const done = await removeTeams(confirm);
            setDeleting(false);
            if (done) {
              setSelected(new Set());
              setOpenId(null);
              setConfirm(null);
            }
          }}
        />
      )}
    </div>
  );
}
