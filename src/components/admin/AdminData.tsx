"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";
import type { AdminSettings, RegistrationStatus, Team, TeamInput, TeamStatus } from "@/lib/types";
import { adminApi, errorMessage } from "./api";

interface Snapshot {
  teams: Team[];
  settings: AdminSettings;
  status: RegistrationStatus;
}

export interface TeamDraft extends TeamInput {
  status?: TeamStatus;
  notes?: string;
}

interface AdminData {
  teams: Team[];
  settings: AdminSettings | null;
  status: RegistrationStatus | null;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  /** All of these update the screen first and roll back if the server refuses. */
  setStatus(ids: string[], status: TeamStatus): Promise<boolean>;
  removeTeams(ids: string[]): Promise<boolean>;
  saveNotes(id: string, notes: string): Promise<boolean>;
  /** Create / edit throw ApiError so the form can show field-level problems. */
  createTeam(draft: TeamDraft): Promise<Team>;
  updateTeam(id: string, draft: TeamDraft): Promise<Team>;
  saveSettings(patch: Partial<AdminSettings>): Promise<boolean>;
}

const AdminDataContext = createContext<AdminData | null>(null);

export function useAdminData(): AdminData {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error("useAdminData must be used inside <AdminDataProvider>");
  return value;
}

const ACTION: Record<TeamStatus, string> = { approved: "approve", rejected: "reject", pending: "pending" };
const DONE: Record<TeamStatus, string> = { approved: "approved", rejected: "rejected", pending: "moved back to pending" };

/** Loads every registration once and keeps it in sync as the organiser works. */
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [status, setStatusInfo] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<Snapshot>("/api/admin/teams");
      setTeams(data.teams);
      setSettings(data.settings);
      setStatusInfo(data.status);
      setError(null);
    } catch (problem) {
      setError(errorMessage(problem));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load; `refresh` only touches state after the request settles.
    const first = window.setTimeout(refresh, 0);
    // Keep the numbers fresh while the tab is open (new teams register all the time).
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 45_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const value = useMemo<AdminData>(() => {
    const names = (ids: string[], list: Team[]) => {
      if (ids.length !== 1) return `${ids.length} teams`;
      return list.find((team) => team.id === ids[0])?.name ?? "Team";
    };

    return {
      teams,
      settings,
      status,
      loading,
      error,
      refresh,

      async setStatus(ids, next) {
        const before = teams;
        setTeams(teams.map((team) => (ids.includes(team.id) ? { ...team, status: next } : team)));
        try {
          if (ids.length === 1) await adminApi(`/api/admin/teams/${ids[0]}`, { method: "PATCH", body: { status: next } });
          else await adminApi("/api/admin/teams/bulk", { method: "POST", body: { ids, action: ACTION[next] } });
          toast({ title: "Saved", body: `${names(ids, before)} ${DONE[next]}.`, sprite: next === "approved" ? "star" : next === "rejected" ? "bomb" : "clock" });
          return true;
        } catch (problem) {
          setTeams(before);
          toast({ title: "Not saved", body: errorMessage(problem), tone: "error" });
          return false;
        }
      },

      async removeTeams(ids) {
        const before = teams;
        setTeams(teams.filter((team) => !ids.includes(team.id)));
        try {
          if (ids.length === 1) await adminApi(`/api/admin/teams/${ids[0]}`, { method: "DELETE" });
          else await adminApi("/api/admin/teams/bulk", { method: "POST", body: { ids, action: "delete" } });
          toast({ title: "Removed", body: `${names(ids, before)} deleted.`, sprite: "snowflake" });
          void refresh();
          return true;
        } catch (problem) {
          setTeams(before);
          toast({ title: "Not removed", body: errorMessage(problem), tone: "error" });
          return false;
        }
      },

      async saveNotes(id, notes) {
        const before = teams;
        setTeams(teams.map((team) => (team.id === id ? { ...team, notes } : team)));
        try {
          await adminApi(`/api/admin/teams/${id}`, { method: "PATCH", body: { notes } });
          toast({ title: "Saved", body: "Note updated.", sprite: "scroll" });
          return true;
        } catch (problem) {
          setTeams(before);
          toast({ title: "Not saved", body: errorMessage(problem), tone: "error" });
          return false;
        }
      },

      async createTeam(draft) {
        const data = await adminApi<{ team: Team }>("/api/admin/teams", { method: "POST", body: draft });
        setTeams((current) => [data.team, ...current]);
        toast({ title: "Team added", body: `${data.team.name} · ${data.team.code}`, sprite: "flag" });
        void refresh();
        return data.team;
      },

      async updateTeam(id, draft) {
        const data = await adminApi<{ team: Team }>(`/api/admin/teams/${id}`, { method: "PATCH", body: draft });
        setTeams((current) => current.map((team) => (team.id === id ? data.team : team)));
        toast({ title: "Saved", body: `${data.team.name} updated.`, sprite: "scroll" });
        return data.team;
      },

      async saveSettings(patch) {
        const before = settings;
        if (settings) setSettings({ ...settings, ...patch });
        try {
          const data = await adminApi<{ settings: AdminSettings; status: RegistrationStatus }>("/api/admin/settings", { method: "PATCH", body: patch });
          setSettings(data.settings);
          setStatusInfo(data.status);
          toast({ title: "Settings saved", body: data.status.open ? "Registration is open." : "Registration is closed to the public.", sprite: data.status.open ? "flag" : "lock" });
          return true;
        } catch (problem) {
          setSettings(before);
          toast({ title: "Not saved", body: errorMessage(problem), tone: "error" });
          return false;
        }
      },
    };
  }, [teams, settings, status, loading, error, refresh, toast]);

  return <AdminDataContext value={value}>{children}</AdminDataContext>;
}
