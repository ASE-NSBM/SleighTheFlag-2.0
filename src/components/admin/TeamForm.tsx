"use client";

import { useState, type FormEvent } from "react";
import { Sprite } from "@/components/ui/Sprite";
import { event, universities } from "@/config/event";
import type { FieldErrors, PersonInput, Team, TeamStatus } from "@/lib/types";
import { TEAM_STATUSES } from "@/lib/types";
import { formatPhone, validateTeam } from "@/lib/validation";
import { useAdminData } from "./AdminData";
import { ApiError, errorMessage } from "./api";
import { statusLabel } from "./bits";
import { useDialog } from "./useDialog";

interface TeamFormProps {
  /** Pass a team to edit it; omit to add a new one. */
  team?: Team;
  onClose(): void;
  onSaved(team: Team): void;
}

const blank = (): PersonInput => ({ fullName: "", studentId: "", email: "", phone: "" });

const without = (errors: FieldErrors, key: string): FieldErrors => Object.fromEntries(Object.entries(errors).filter(([name]) => name !== key));

const PERSON_FIELDS: { key: keyof PersonInput; label: string; type: string; placeholder?: string; mono?: boolean }[] = [
  { key: "fullName", label: "Full name", type: "text" },
  { key: "studentId", label: "Student ID", type: "text", mono: true },
  { key: "email", label: "Email", type: "email", mono: true },
  { key: "phone", label: "Contact", type: "tel", placeholder: "077 123 4567", mono: true },
];

/**
 * Add or edit a team by hand. Organisers get relaxed rules compared with the
 * public form (a personal email or a one-person team can be let through),
 * but formats and duplicates are still checked.
 */
export function TeamForm({ team, onClose, onSaved }: TeamFormProps) {
  const { createTeam, updateTeam } = useAdminData();
  const editing = Boolean(team);
  const ref = useDialog<HTMLFormElement>(onClose);

  const [teamName, setTeamName] = useState(team?.name ?? "");
  const [university, setUniversity] = useState(team?.university ?? "");
  const [status, setStatus] = useState<TeamStatus>(team?.status ?? "approved");
  const [notes, setNotes] = useState(team?.notes ?? "");
  const [members, setMembers] = useState<PersonInput[]>(
    team ? team.members.map((member) => ({ fullName: member.fullName, studentId: member.studentId, email: member.email, phone: formatPhone(member.phone) })) : [blank(), blank()],
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const edit = (index: number, key: keyof PersonInput, value: string) => {
    setMembers((list) => list.map((member, i) => (i === index ? { ...member, [key]: value } : member)));
    setErrors((current) => without(current, `members.${index}.${key}`));
  };

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (busy) return;
    const draft = { teamName, university, members };
    const checked = validateTeam(draft, { strict: false });
    if (!checked.ok) {
      setErrors(checked.fieldErrors);
      setFormError("Some details need another look.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const saved = team ? await updateTeam(team.id, { ...draft, status, notes }) : await createTeam({ ...draft, status, notes });
      onSaved(saved);
    } catch (problem) {
      if (problem instanceof ApiError && problem.fieldErrors) setErrors(problem.fieldErrors);
      setFormError(errorMessage(problem));
      setBusy(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="px-error !mt-2 !text-[0.875rem]" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <>
      <div className="scrim !z-[104]" onClick={onClose} aria-hidden="true" />
      <form ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="team-form-title" className="modal px-box px-solid outline-none" onSubmit={submit} noValidate>
        <header className="flex items-center justify-between gap-4 border-b-[3px] border-black px-6 py-4">
          <h2 id="team-form-title" className="adm-h1 !text-[0.875rem]">
            {editing ? `Edit ${team?.name}` : "Add a team"}
          </h2>
          <button type="button" className="px-btn px-btn-ghost px-btn-icon" onClick={onClose} aria-label="Close">
            <Sprite name="close" size={12} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {formError && (
            <p className="flex gap-3 bg-berry-800/45 px-4 py-3 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
              <Sprite name="alert" size={12} className="mt-[7px]" />
              <span>{formError}</span>
            </p>
          )}

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label htmlFor="tf-name" className="px-label">
                Team name
              </label>
              <input
                id="tf-name"
                data-autofocus
                className="px-input"
                maxLength={32}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={errors.teamName ? true : undefined}
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setErrors((current) => without(current, "teamName"));
                }}
              />
              {fieldError("teamName")}
            </div>
            <div>
              <label htmlFor="tf-university" className="px-label">
                University
              </label>
              <input
                id="tf-university"
                className="px-input"
                list="tf-universities"
                maxLength={120}
                autoComplete="off"
                aria-invalid={errors.university ? true : undefined}
                value={university}
                onChange={(e) => {
                  setUniversity(e.target.value);
                  setErrors((current) => without(current, "university"));
                }}
              />
              <datalist id="tf-universities">
                {universities.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {fieldError("university")}
            </div>
            <div>
              <label htmlFor="tf-status" className="px-label">
                Status
              </label>
              <select id="tf-status" className="px-input" value={status} onChange={(e) => setStatus(e.target.value as TeamStatus)}>
                {TEAM_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tf-notes" className="px-label">
                Organiser note
              </label>
              <input id="tf-notes" className="px-input" maxLength={2000} placeholder="Only organisers see this" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {errors.members && (
            <p className="px-error !mt-0" role="alert">
              {errors.members}
            </p>
          )}

          {members.map((member, index) => (
            <div key={index} role="group" aria-labelledby={`tf-member-${index}`} className="bg-night-950/45 p-4 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.45)]">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 id={`tf-member-${index}`} className="font-pixel text-[0.625rem] uppercase tracking-wider text-gold-300">
                  {index === 0 ? "Team leader" : `Member ${index + 1}`}
                </h3>
                {index > 0 && (
                  <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={() => setMembers((list) => list.filter((_, i) => i !== index))}>
                    <Sprite name="trash" size={12} />
                    Remove<span className="sr-only"> member {index + 1}</span>
                  </button>
                )}
              </div>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                {PERSON_FIELDS.map((field) => {
                  const key = `members.${index}.${field.key}`;
                  return (
                    <div key={field.key}>
                      <label htmlFor={`tf-${index}-${field.key}`} className="px-label !mb-2 !text-[0.5625rem]">
                        {field.label}
                      </label>
                      <input
                        id={`tf-${index}-${field.key}`}
                        className={`px-input ${field.mono ? "data" : ""}`}
                        type={field.type}
                        placeholder={field.placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={errors[key] ? true : undefined}
                        value={member[field.key]}
                        onChange={(e) => edit(index, field.key, e.target.value)}
                      />
                      {fieldError(key)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {members.length < event.team.maxSize && (
            <button
              type="button"
              className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 border-0 bg-night-950/50 text-snow-200 shadow-[0_0_0_3px_var(--color-night-600)] hover:bg-night-700 hover:text-white"
              onClick={() => setMembers((list) => [...list, blank()])}
            >
              <Sprite name="plus" size={12} />
              <span className="font-pixel text-[0.625rem] uppercase tracking-wider">Add member {members.length + 1}</span>
            </button>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-black px-6 py-4">
          <p className="text-[0.875rem] text-snow-400">Organiser entry: personal emails and solo teams are allowed.</p>
          <div className="flex gap-4">
            <button type="button" className="px-btn px-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="px-btn px-btn-pine" disabled={busy}>
              <Sprite name="check" size={12} />
              {busy ? "Saving…" : editing ? "Save changes" : "Add team"}
            </button>
          </div>
        </footer>
      </form>
    </>
  );
}
