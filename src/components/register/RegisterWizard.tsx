"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";
import { useToast } from "@/components/ui/Toast";
import { event, organizer, universities } from "@/config/event";
import { fetchRegistrationStatus } from "@/lib/client-status";
import { formatStamp } from "@/lib/format";
import type { FieldErrors, PersonInput, RegistrationReason, RegistrationStatus } from "@/lib/types";
import { formatPhone, limits, normalizePhone, validatePerson, validateTeam, validateTeamFields, validateTeamName } from "@/lib/validation";
import { describedBy, Field, fieldId, UniversityPicker } from "./fields";
import { PartyPreview } from "./PartyPreview";

/* ───────────────────────────── model ────────────────────────────────── */

interface Draft {
  teamName: string;
  university: string;
  members: PersonInput[];
}

interface Receipt {
  /** Invite to the participants' WhatsApp group, when the organisers have set one. */
  whatsappUrl: string | null;
  code: string;
  teamName: string;
  university: string;
  members: PersonInput[];
}

type Phase = "loading" | "form" | "closed" | "unavailable" | "done";
type NameCheck = { state: "idle" | "checking" | "free" | "taken" };

const STEPS: { label: string; title: string; blurb: string; sprite: SpriteName }[] = [
  { label: "Team", title: "Name your team", blurb: "This is the name that goes on the scoreboard.", sprite: "flag" },
  { label: "Leader", title: "Who leads the party?", blurb: "The team leader is our point of contact for everything.", sprite: "star" },
  { label: "Crew", title: "Assemble your crew", blurb: `Teams have ${limits.minSize}–${limits.maxSize} players, leader included.`, sprite: "party" },
  { label: "Confirm", title: "Check and submit", blurb: "One last look before the flag goes up.", sprite: "scroll" },
];

const CLOSED_COPY: Record<Exclude<RegistrationReason, "open">, { title: string; body: string }> = {
  paused: { title: "Registration is paused", body: "The organisers have paused sign-ups for a moment. Check back soon." },
  "not-yet": { title: "Registration opens soon", body: `Sign-ups open on ${formatStamp(event.dates.registrationOpens)} (Sri Lanka time).` },
  deadline: { title: "Registration has closed", body: "The deadline has passed. If your team missed it, contact the organisers." },
  full: { title: "Every slot is taken", body: "All team slots have been claimed. Contact the organisers to join the waiting list." },
};

const DRAFT_KEY = "stf2:registration-draft:v1";

const emptyPerson = (): PersonInput => ({ fullName: "", studentId: "", email: "", phone: "" });
const freshDraft = (): Draft => ({ teamName: "", university: "", members: Array.from({ length: limits.minSize }, emptyPerson) });

/** Drafts live only in this browser, so a refresh never costs anyone their typing. */
function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Draft>;
    if (typeof data.teamName !== "string" || typeof data.university !== "string" || !Array.isArray(data.members)) return null;
    const text = (value: unknown) => (typeof value === "string" ? value.slice(0, 160) : "");
    const members = data.members.slice(0, limits.maxSize).map((member) => ({
      fullName: text(member?.fullName),
      studentId: text(member?.studentId),
      email: text(member?.email),
      phone: text(member?.phone),
    }));
    while (members.length < limits.minSize) members.push(emptyPerson());
    const draft = { teamName: text(data.teamName), university: text(data.university), members };
    const untouched = !draft.teamName && !draft.university && members.every((member) => Object.values(member).every((value) => value === ""));
    return untouched ? null : draft;
  } catch {
    return null;
  }
}

const stepOf = (key: string) => (key === "teamName" || key === "university" ? 0 : key.startsWith("members.0.") ? 1 : key.startsWith("members") ? 2 : 3);

const withoutStep = (errors: FieldErrors, step: number): FieldErrors =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => stepOf(key) !== step));

/* Confetti is positioned from a hash so every render is identical (and SSR-safe). */
const confetti = Array.from({ length: 34 }, (_, index) => {
  const a = Math.sin(index * 12.9898) * 43758.5453;
  const b = Math.sin(index * 78.233) * 12543.123;
  const r1 = a - Math.floor(a);
  const r2 = b - Math.floor(b);
  return {
    color: ["#e63946", "#ffc93c", "#4fd47d", "#6cc4f7", "#ffffff", "#9b7bff"][index % 6],
    dx: `${Math.round((r1 - 0.5) * 520)}px`,
    dy: `${Math.round(-60 - r2 * 240)}px`,
    rot: `${Math.round((r1 - 0.5) * 720)}deg`,
    delay: `${Math.round(r2 * 180)}ms`,
    size: 6 + (index % 3) * 3,
  };
});

/* ───────────────────────────── one person ───────────────────────────── */

interface PersonFieldsProps {
  index: number;
  member: PersonInput;
  errors: FieldErrors;
  onChange(index: number, field: keyof PersonInput, value: string): void;
  onBlur(key: string): void;
}

/** The four fields collected for every player. Index 0 is the team leader. */
function PersonFields({ index, member, errors, onChange, onBlur }: PersonFieldsProps) {
  const lead = index === 0;
  const key = (field: keyof PersonInput) => `members.${index}.${field}`;
  const id = (field: keyof PersonInput) => fieldId(key(field));
  const error = (field: keyof PersonInput) => errors[key(field)];
  return (
    <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
      <Field id={id("fullName")} label="Full name" required error={error("fullName")}>
        <input
          id={id("fullName")}
          className="px-input"
          type="text"
          autoComplete={lead ? "name" : "off"}
          autoCapitalize="words"
          spellCheck={false}
          maxLength={80}
          aria-required="true"
          aria-invalid={error("fullName") ? true : undefined}
          aria-describedby={describedBy(id("fullName"), error("fullName"))}
          value={member.fullName}
          onChange={(e) => onChange(index, "fullName", e.target.value)}
          onBlur={() => onBlur(key("fullName"))}
        />
      </Field>
      <Field id={id("studentId")} label="Student ID" required error={error("studentId")} hint="Exactly as printed on the student card.">
        <input
          id={id("studentId")}
          className="px-input data"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={24}
          aria-required="true"
          aria-invalid={error("studentId") ? true : undefined}
          aria-describedby={describedBy(id("studentId"), error("studentId"), true)}
          value={member.studentId}
          onChange={(e) => onChange(index, "studentId", e.target.value)}
          onBlur={() => onBlur(key("studentId"))}
        />
      </Field>
      <Field
        id={id("email")}
        label="University email"
        required
        error={error("email")}
        hint={event.requireUniversityEmail ? "Your university inbox — not Gmail or Outlook." : undefined}
      >
        <input
          id={id("email")}
          className="px-input data"
          type="email"
          inputMode="email"
          autoComplete={lead ? "email" : "off"}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={120}
          placeholder="name@students.nsbm.ac.lk"
          aria-required="true"
          aria-invalid={error("email") ? true : undefined}
          aria-describedby={describedBy(id("email"), error("email"), event.requireUniversityEmail)}
          value={member.email}
          onChange={(e) => onChange(index, "email", e.target.value)}
          onBlur={() => onBlur(key("email"))}
        />
      </Field>
      <Field id={id("phone")} label="Contact number" required error={error("phone")} hint={lead ? "WhatsApp preferred — we use it for event updates." : undefined}>
        <input
          id={id("phone")}
          className="px-input data"
          type="tel"
          inputMode="tel"
          autoComplete={lead ? "tel" : "off"}
          maxLength={24}
          placeholder="077 123 4567"
          aria-required="true"
          aria-invalid={error("phone") ? true : undefined}
          aria-describedby={describedBy(id("phone"), error("phone"), lead)}
          value={member.phone}
          onChange={(e) => onChange(index, "phone", e.target.value)}
          onBlur={() => onBlur(key("phone"))}
        />
      </Field>
    </div>
  );
}

/* ───────────────────────────── component ────────────────────────────── */

export function RegisterWizard() {
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: "idle" });
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [universityIsOther, setUniversityIsOther] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<string | null>(null);
  const saveTimer = useRef(0);
  const nameTimer = useRef(0);
  const nameRequest = useRef<AbortController | null>(null);

  /* Find out whether registration is open, then restore any saved draft. */
  const alive = useRef(true);

  const applyStatus = useCallback((next: RegistrationStatus | null) => {
    if (!alive.current) return;
    setStatus(next);
    if (!next) {
      // The server couldn't answer. Better to say so now than after sixteen fields.
      setPhase("unavailable");
      return;
    }
    const saved = loadDraft();
    if (saved) {
      setDraft(saved);
      setRestored(true);
    }
    setPhase(next.open ? "form" : "closed");
  }, []);

  useEffect(() => {
    alive.current = true;
    void fetchRegistrationStatus().then(applyStatus);
    return () => {
      alive.current = false;
      window.clearTimeout(saveTimer.current);
      window.clearTimeout(nameTimer.current);
      nameRequest.current?.abort();
    };
  }, [applyStatus]);

  const retryStatus = () => {
    setPhase("loading");
    void fetchRegistrationStatus(true).then(applyStatus);
  };

  /* After a step change or a failed check, put the keyboard where it is needed. */
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    if (target === "heading") headingRef.current?.focus();
    else document.getElementById(target)?.focus();
  }, [step, errors, phase]);

  /* ── editing ─────────────────────────────────────────────────────── */

  const commit = (next: Draft) => {
    setDraft(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* private mode or a full disk: the form still works without autosave */
      }
    }, 350);
  };

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const setError = (key: string, message: string | undefined) => {
    if (!message) clearError(key);
    else setErrors((current) => ({ ...current, [key]: message }));
  };

  /** Ask the server whether the name is free, a beat after the typing stops. */
  const checkName = (value: string) => {
    window.clearTimeout(nameTimer.current);
    nameRequest.current?.abort();
    const local = validateTeamName(value);
    if (!local.ok) {
      setNameCheck({ state: "idle" });
      return;
    }
    setNameCheck({ state: "checking" });
    nameTimer.current = window.setTimeout(async () => {
      const controller = new AbortController();
      nameRequest.current = controller;
      try {
        const response = await fetch(`/api/public/team-name?name=${encodeURIComponent(local.data)}`, { signal: controller.signal, cache: "no-store" });
        const data = (await response.json()) as { ok: boolean; available?: boolean };
        if (controller.signal.aborted) return;
        if (!data.ok) setNameCheck({ state: "idle" });
        else if (data.available) setNameCheck({ state: "free" });
        else {
          setNameCheck({ state: "taken" });
          setError("teamName", "That team name is already taken — pick another one.");
        }
      } catch {
        if (!controller.signal.aborted) setNameCheck({ state: "idle" });
      }
    }, 450);
  };

  const setTeamName = (value: string) => {
    commit({ ...draft, teamName: value });
    clearError("teamName");
    checkName(value);
  };

  const setMember = (index: number, field: keyof PersonInput, value: string) => {
    const members = draft.members.map((member, i) => (i === index ? { ...member, [field]: value } : member));
    commit({ ...draft, members });
    clearError(`members.${index}.${field}`);
  };

  const addMember = () => {
    if (draft.members.length >= limits.maxSize) return;
    const index = draft.members.length;
    commit({ ...draft, members: [...draft.members, emptyPerson()] });
    focusNext.current = fieldId(`members.${index}.fullName`);
    setErrors((current) => ({ ...current })); // nudge the focus effect
  };

  const removeMember = (index: number) => {
    commit({ ...draft, members: draft.members.filter((_, i) => i !== index) });
    // Error keys are positional, so drop everything from the crew step and re-check on Next.
    setErrors((current) => withoutStep(current, 2));
  };

  /** Format check when a field loses focus — but never nag about fields left empty. */
  const validateOnBlur = (key: string) => {
    if (key === "teamName") {
      if (!draft.teamName.trim()) return;
      const result = validateTeamName(draft.teamName);
      if (!result.ok) setError(key, result.fieldErrors.teamName);
      return;
    }
    if (key === "university") {
      if (!draft.university.trim()) return;
      const result = validateTeamFields({ teamName: "placeholder", university: draft.university });
      setError(key, result.ok ? undefined : result.fieldErrors.university);
      return;
    }
    const match = key.match(/^members\.(\d+)\.(\w+)$/);
    if (!match) return;
    const index = Number(match[1]);
    const field = match[2] as keyof PersonInput;
    const member = draft.members[index];
    if (!member || !member[field].trim()) return;
    const result = validatePerson(member, index);
    setError(key, result.ok ? undefined : result.fieldErrors[key]);
    // Show the number the way we will store it, so there are no surprises.
    if (field === "phone") {
      const normal = normalizePhone(member.phone);
      if (normal && formatPhone(normal) !== member.phone) setMember(index, "phone", formatPhone(normal));
    }
  };

  /* ── navigation ──────────────────────────────────────────────────── */

  const errorsFor = (target: number): FieldErrors => {
    const found: FieldErrors = {};
    if (target === 0) {
      const result = validateTeamFields({ teamName: draft.teamName, university: draft.university });
      if (!result.ok) Object.assign(found, result.fieldErrors);
      if (!found.teamName && nameCheck.state === "taken") found.teamName = "That team name is already taken — pick another one.";
    } else if (target === 1) {
      const result = validatePerson(draft.members[0], 0);
      if (!result.ok) Object.assign(found, result.fieldErrors);
    } else if (target === 2) {
      draft.members.forEach((member, index) => {
        if (index === 0) return;
        const result = validatePerson(member, index);
        if (!result.ok) Object.assign(found, result.fieldErrors);
      });
      // Duplicates between members only show up when the team is checked as a whole.
      const whole = validateTeam(draft);
      if (!whole.ok) {
        for (const [key, message] of Object.entries(whole.fieldErrors)) if (stepOf(key) === 2 && !(key in found)) found[key] = message;
      }
    }
    return found;
  };

  const showErrors = (found: FieldErrors, replaceStep?: number) => {
    const firstKey = Object.keys(found).sort((a, b) => stepOf(a) - stepOf(b))[0];
    const firstStep = stepOf(firstKey);
    focusNext.current = firstKey === "members" ? "heading" : fieldId(firstKey);
    setErrors((current) => ({ ...(replaceStep === undefined ? {} : withoutStep(current, replaceStep)), ...found }));
    setStep(firstStep);
  };

  const goTo = (target: number) => {
    focusNext.current = "heading";
    setFormError(null);
    setStep(target);
  };

  const next = () => {
    const found = errorsFor(step);
    if (Object.keys(found).length > 0) {
      showErrors(found, step);
      return;
    }
    setErrors((current) => withoutStep(current, step));
    if (step === 2) toast({ title: "Party assembled", body: `${draft.members.length} players are ready for the hunt.`, sprite: "party" });
    goTo(step + 1);
  };

  const submit = async () => {
    const whole = validateTeam(draft);
    const found: FieldErrors = whole.ok ? {} : { ...whole.fieldErrors };
    if (!consent) found.consent = "Tick the box to confirm your details and accept the rules.";
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, consent: true, fax: trap }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: true; code: string; teamName: string; university: string; whatsappUrl?: string | null }
        | { ok: false; error: string; fieldErrors?: FieldErrors }
        | null;

      if (data?.ok) {
        try {
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* nothing to clean up */
        }
        setReceipt({ whatsappUrl: typeof data.whatsappUrl === "string" && data.whatsappUrl.startsWith("https://chat.whatsapp.com/") ? data.whatsappUrl : null, code: data.code, teamName: data.teamName, university: data.university, members: draft.members });
        focusNext.current = "heading";
        setPhase("done");
        toast({ title: "Quest accepted", body: `${data.teamName} is on the island.`, sprite: "flag" });
        window.dispatchEvent(new Event("stf:registered"));
        return;
      }

      if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        showErrors(data.fieldErrors);
        setFormError(data.error);
      } else if (response.status === 403) {
        setStatus((current) => (current ? { ...current, open: false, reason: "paused" } : current));
        setFormError(data?.error ?? "Registration is closed.");
      } else {
        setFormError(data?.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again — your details are still here.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (submitting) return;
    if (step < STEPS.length - 1) next();
    else void submit();
  };

  const startOver = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* nothing stored */
    }
    setDraft(freshDraft());
    setErrors({});
    setConsent(false);
    setRestored(false);
    setNameCheck({ state: "idle" });
    setReceipt(null);
    setFormError(null);
    focusNext.current = "heading";
    setStep(0);
    setPhase("form");
  };

  const copyCode = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast({ title: "Copy failed", body: "Select the code and copy it by hand.", tone: "error" });
    }
  };

  /* ── pieces ──────────────────────────────────────────────────────── */

  /* ── loading / closed / done ─────────────────────────────────────── */

  if (phase === "loading") {
    return (
      <div className="px-box px-solid p-6 sm:p-9" aria-busy="true" aria-label="Loading the registration form">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton mt-8 h-14 w-full" />
        <div className="skeleton mt-6 h-14 w-full" />
        <div className="skeleton mt-8 h-12 w-40" />
      </div>
    );
  }

  if (phase === "unavailable") {
    return (
      <div className="px-box px-solid snowcap mx-auto max-w-[640px] p-7 text-center sm:p-10">
        <Sprite name="snowflake" size={64} className="mx-auto" />
        <h3 className="h-section mt-6 !text-[1.125rem]">Registration is snowed in</h3>
        <p className="mt-4 text-snow-200" role="status">
          We couldn&apos;t reach the registration desk just now. Nothing is lost — give it a moment and try again.
        </p>
        <button
          type="button"
          className="px-btn px-btn-pine mt-7"
          onClick={retryStatus}
        >
          Try again
        </button>
        <p className="mt-6 text-snow-300">
          Still stuck? Email{" "}
          <a className="text-gold-300 underline decoration-2 underline-offset-4" href={`mailto:${organizer.email}`}>
            {organizer.email}
          </a>
        </p>
      </div>
    );
  }

  if (phase === "closed") {
    const copy = CLOSED_COPY[(status?.reason && status.reason !== "open" ? status.reason : "deadline") as Exclude<RegistrationReason, "open">];
    return (
      <div className="px-box px-solid snowcap mx-auto max-w-[640px] p-7 text-center sm:p-10">
        <Sprite name="lock" size={64} className="mx-auto" />
        <h3 className="h-section mt-6 !text-[1.125rem]">{copy.title}</h3>
        <p className="mt-4 text-snow-200">{copy.body}</p>
        <p className="mt-6 text-snow-300">
          Need help? Email{" "}
          <a className="text-gold-300 underline decoration-2 underline-offset-4" href={`mailto:${organizer.email}`}>
            {organizer.email}
          </a>
        </p>
      </div>
    );
  }

  if (phase === "done" && receipt) {
    return (
      <div className="px-box px-solid snowcap relative mx-auto max-w-[860px] p-6 sm:p-10">
        <div className="pointer-events-none absolute left-1/2 top-24 z-10" aria-hidden="true">
          {confetti.map((piece, index) => (
            <i
              key={index}
              className="absolute block"
              style={
                {
                  width: piece.size,
                  height: piece.size,
                  background: piece.color,
                  animation: `confetti 1500ms cubic-bezier(0.2, 0.8, 0.3, 1) ${piece.delay} both`,
                  "--dx": piece.dx,
                  "--dy": piece.dy,
                  "--rot": piece.rot,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="text-center">
          <Sprite name="flag" size={64} className="float mx-auto" />
          <p className="kicker mt-5 !text-pine-300">Quest accepted</p>
          <h3 ref={headingRef} tabIndex={-1} className="h-section mt-3 outline-none">
            You&apos;re <em>in</em>, {receipt.teamName}!
          </h3>
          <p className="lead mx-auto mt-4 max-w-[52ch]">Your team is registered. Save the code below — the organisers use it in every message about your team.</p>
        </div>

        <div className="mt-9 grid items-start gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="bg-night-950 p-5 text-center shadow-[0_0_0_4px_var(--color-gold-400),0_0_0_8px_#04060f]">
              <p className="font-pixel text-[0.625rem] uppercase tracking-widest text-snow-400">Registration code</p>
              <p className="term mt-2 select-all text-[2.75rem] leading-none text-gold-300">{receipt.code}</p>
              <button type="button" className="px-btn px-btn-gold px-btn-sm mt-5" onClick={copyCode}>
                <Sprite name={copied ? "check" : "copy"} size={12} />
                {copied ? "Copied" : "Copy code"}
              </button>
              <span className="sr-only" role="status">
                {copied ? "Registration code copied to the clipboard" : ""}
              </span>
            </div>

            {receipt.whatsappUrl && (
              <div className="mt-8 bg-pine-800/55 p-5 shadow-[0_0_0_4px_var(--color-pine-500),0_0_0_8px_#04060f]">
                <h4 className="h-card">One more step: join the WhatsApp group</h4>
                <p className="mt-2 text-snow-200">
                  All announcements, briefing details and event-day updates are posted there. Share this link with every member of your team.
                </p>
                <a href={receipt.whatsappUrl} target="_blank" rel="noopener noreferrer" className="px-btn px-btn-pine px-btn-lg mt-5">
                  <Sprite name="phone" size={24} />
                  Join the WhatsApp group
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            )}

            <h4 className="kicker mt-8">What happens next</h4>
            <ol className="mt-4 list-none space-y-3 p-0 text-snow-200">
              {[
                `${organizer.shortName} reviews your team against the student IDs and university emails you entered.`,
                receipt.whatsappUrl ? "Confirmation and briefing details are announced in the WhatsApp group." : "The team leader is contacted with the confirmation and the briefing details.",
                `Be ready when the hunt begins on ${formatStamp(event.dates.eventStart)}.`,
              ].map((line, index) => (
                <li key={line} className="grid grid-cols-[28px_1fr] gap-3">
                  <span className="font-pixel pt-1 text-[0.625rem] text-gold-400">{index + 1}.</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-5">
              <a href="#quests" className="px-btn px-btn-pine">
                See the timeline
              </a>
              <button type="button" className="px-btn px-btn-ghost" onClick={startOver}>
                Register another team
              </button>
            </div>
          </div>

          <PartyPreview teamName={receipt.teamName} university={receipt.university} members={receipt.members} maxSize={receipt.members.length} code={receipt.code} />
        </div>
      </div>
    );
  }

  /* ── the form ────────────────────────────────────────────────────── */

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const stepErrors = Object.keys(errors).filter((key) => stepOf(key) === step).length;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form className="px-box px-solid snowcap min-w-0 p-5 sm:p-8" onSubmit={onSubmit} noValidate aria-labelledby="register-step-title">
        {/* Progress: where you are, and a way back to finished steps */}
        <ol className="grid list-none grid-cols-4 gap-2 p-0 sm:gap-3">
          {STEPS.map((item, index) => {
            const state = index < step ? "done" : index === step ? "current" : "todo";
            return (
              <li key={item.label}>
                <button
                  type="button"
                  disabled={index > step}
                  aria-current={state === "current" ? "step" : undefined}
                  onClick={() => index < step && goTo(index)}
                  className="group flex w-full flex-col items-center gap-2 border-0 bg-transparent p-0 text-center disabled:cursor-default enabled:cursor-pointer"
                >
                  <span
                    className={`block h-2.5 w-full ${state === "done" ? "bg-pine-500" : state === "current" ? "bg-gold-400" : "bg-night-700"} shadow-[inset_0_-3px_0_0_rgb(0_0_0/0.28)]`}
                  />
                  <span className={`font-pixel text-[0.5625rem] uppercase leading-relaxed tracking-wider ${state === "todo" ? "text-snow-500" : state === "done" ? "text-pine-300 group-hover:text-white" : "text-gold-300"}`}>
                    <span className="hidden sm:inline">{index + 1}. </span>
                    {item.label}
                    <span className="sr-only">{state === "done" ? " (completed — go back)" : state === "current" ? " (current step)" : " (not reached yet)"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex items-start gap-4">
          <Sprite name={current.sprite} size={48} className="hidden shrink-0 sm:block" />
          <div>
            <h3 id="register-step-title" ref={headingRef} tabIndex={-1} className="h-section !text-[1.0625rem] outline-none sm:!text-[1.25rem]">
              {current.title}
            </h3>
            <p className="mt-2 text-snow-300">{current.blurb}</p>
          </div>
        </div>

        {restored && step === 0 && (
          <p className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-night-950/70 px-4 py-3 text-[1rem] text-snow-200 shadow-[0_0_0_2px_var(--color-ice-600)]">
            <span>We kept the details you typed earlier on this device.</span>
            <button type="button" className="text-ice-300 underline decoration-2 underline-offset-4 hover:text-white" onClick={startOver}>
              Start fresh
            </button>
          </p>
        )}

        {(formError || stepErrors > 1) && (
          <div className="mt-6 flex gap-3 bg-berry-800/45 px-4 py-3 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
            <Sprite name="alert" size={12} className="mt-[7px]" />
            <p>{formError ?? `${stepErrors} fields on this step need another look.`}</p>
          </div>
        )}

        <div className="mt-8">
          {step === 0 && (
            <div className="grid gap-y-7">
              <Field
                id={fieldId("teamName")}
                label="Team name"
                required
                error={errors.teamName}
                success={nameCheck.state === "free" ? "Nice — that name is free." : undefined}
                hint={nameCheck.state === "checking" ? "Checking if it's free…" : "3–32 characters. Keep it scoreboard-friendly."}
              >
                <input
                  id={fieldId("teamName")}
                  className="px-input"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="e.g. Frost Bytes"
                  aria-required="true"
                  aria-invalid={errors.teamName ? true : undefined}
                  aria-describedby={describedBy(fieldId("teamName"), errors.teamName, true)}
                  data-valid={nameCheck.state === "free" && !errors.teamName ? true : undefined}
                  value={draft.teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onBlur={() => validateOnBlur("teamName")}
                />
              </Field>

              <Field id={fieldId("university")} label="University / institute" required error={errors.university} hint={universityIsOther ? undefined : "Search the list. Not there? Choose “Other” and type it."}>
                <UniversityPicker
                  id={fieldId("university")}
                  value={draft.university}
                  options={universities}
                  invalid={Boolean(errors.university)}
                  describedBy={describedBy(fieldId("university"), errors.university, !universityIsOther)}
                  onChange={(value) => {
                    commit({ ...draft, university: value });
                    clearError("university");
                  }}
                  onBlur={() => validateOnBlur("university")}
                  onCustomChange={setUniversityIsOther}
                />
              </Field>
            </div>
          )}

          {step === 1 && <PersonFields index={0} member={draft.members[0]} errors={errors} onChange={setMember} onBlur={validateOnBlur} />}

          {step === 2 && (
            <div className="space-y-9">
              {errors.members && (
                <p className="px-error !mt-0" role="alert">
                  <Sprite name="alert" size={12} className="mt-[5px]" />
                  <span>{errors.members}</span>
                </p>
              )}
              {draft.members.map((_, index) =>
                index === 0 ? null : (
                  <div key={index} role="group" aria-labelledby={`member-${index}-title`}>
                    <div className="mb-5 flex items-center justify-between gap-4 border-b-4 border-night-700 pb-3">
                      <h4 id={`member-${index}-title`} className="font-pixel text-[0.75rem] text-gold-300">
                        Member {index + 1}
                      </h4>
                      {index >= limits.minSize ? (
                        <button type="button" className="px-btn px-btn-ghost px-btn-sm" onClick={() => removeMember(index)}>
                          <Sprite name="trash" size={12} />
                          Remove<span className="sr-only"> member {index + 1}</span>
                        </button>
                      ) : (
                        <span className="px-chip px-chip-berry">Required</span>
                      )}
                    </div>
                    <PersonFields index={index} member={draft.members[index]} errors={errors} onChange={setMember} onBlur={validateOnBlur} />
                  </div>
                ),
              )}

              {draft.members.length < limits.maxSize ? (
                <button
                  type="button"
                  onClick={addMember}
                  className="flex min-h-[64px] w-full cursor-pointer items-center justify-center gap-3 border-0 bg-night-950/50 text-snow-200 shadow-[0_0_0_4px_var(--color-night-600)] transition-colors hover:bg-night-700 hover:text-white"
                >
                  <Sprite name="plus" size={24} />
                  <span className="font-pixel text-[0.6875rem] uppercase tracking-wider">
                    Add member {draft.members.length + 1} <span className="text-snow-400">(optional)</span>
                  </span>
                </button>
              ) : (
                <p className="text-center text-snow-400">Your party is full — {limits.maxSize} players is the maximum.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-7">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div className="bg-night-950/60 p-4 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.5)]">
                  <dt className="font-pixel text-[0.5625rem] uppercase tracking-widest text-snow-400">Team</dt>
                  <dd className="mt-1.5 break-words text-snow-50">{draft.teamName.trim()}</dd>
                </div>
                <div className="bg-night-950/60 p-4 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.5)]">
                  <dt className="font-pixel text-[0.5625rem] uppercase tracking-widest text-snow-400">University</dt>
                  <dd className="mt-1.5 break-words text-snow-50">{draft.university.trim()}</dd>
                </div>
              </dl>

              <ul className="list-none space-y-4 p-0">
                {draft.members.map((member, index) => (
                  <li key={index} className="bg-night-950/60 p-4 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.5)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-snow-50">
                        {member.fullName.trim()} <span className="ml-2 align-middle">{index === 0 && <span className="px-chip px-chip-gold">Leader</span>}</span>
                      </p>
                      <button type="button" className="text-[1rem] text-ice-300 underline decoration-2 underline-offset-4 hover:text-white" onClick={() => goTo(index === 0 ? 1 : 2)}>
                        Edit<span className="sr-only"> {member.fullName}</span>
                      </button>
                    </div>
                    <p className="data mt-2 break-all text-snow-300">
                      {member.studentId.trim()} · {member.email.trim().toLowerCase()} · {formatPhone(normalizePhone(member.phone) ?? member.phone.trim())}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Honeypot: invisible to people and to assistive tech. */}
              <div className="absolute left-[-9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="f-fax">Leave this field empty</label>
                <input id="f-fax" name="fax" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </div>

              <div>
                <label className="flex cursor-pointer items-start gap-4">
                  <input
                    id={fieldId("consent")}
                    type="checkbox"
                    className="px-check"
                    checked={consent}
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={errors.consent ? `${fieldId("consent")}-error` : undefined}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      clearError("consent");
                    }}
                  />
                  <span className="text-snow-200">
                    I confirm these details are accurate, every member has agreed to take part, and our team accepts the{" "}
                    <a href="#rules" className="text-gold-300 underline decoration-2 underline-offset-4 hover:text-gold-200">
                      competition rules
                    </a>
                    . Details are shared only with the {organizer.shortName} organisers.
                  </span>
                </label>
                {errors.consent && (
                  <p id={`${fieldId("consent")}-error`} className="px-error" role="alert">
                    <Sprite name="alert" size={12} className="mt-[5px]" />
                    <span>{errors.consent}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t-4 border-night-700 pt-7">
          {step > 0 ? (
            <button type="button" className="px-btn px-btn-ghost" onClick={() => goTo(step - 1)} disabled={submitting}>
              <Sprite name="chevron-left" size={12} />
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className={`px-btn ${last ? "px-btn-berry px-btn-lg" : "px-btn-pine"}`} disabled={submitting}>
            {last ? (
              <>
                <Sprite name="flag" size={24} />
                {submitting ? "Planting the flag…" : "Register team"}
              </>
            ) : (
              <>
                Next: {STEPS[step + 1].label}
                <Sprite name="chevron-right" size={12} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* The live team card is a desktop nicety; on a phone it would only add scrolling under the form. */}
      <aside className="max-sm:hidden lg:sticky lg:top-[calc(var(--top-h)+24px)]" aria-label="Team preview">
        <PartyPreview teamName={draft.teamName} university={draft.university} members={draft.members} maxSize={limits.maxSize} />
        <p className="mt-5 hidden text-center text-[0.9375rem] text-snow-400 lg:block">Your team card builds itself as you type.</p>
      </aside>
    </div>
  );
}
