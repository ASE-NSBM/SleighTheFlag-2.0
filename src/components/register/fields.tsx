"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Sprite } from "@/components/ui/Sprite";

/** "members.1.email" → "f-members-1-email" */
export const fieldId = (key: string) => `f-${key.replace(/\./g, "-")}`;

export const describedBy = (id: string, error?: string, hint?: unknown) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  success?: ReactNode;
  children: ReactNode;
}

/** Label + control + exactly one line of feedback below it (error beats success beats hint). */
export function Field({ id, label, required, error, hint, success, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="px-label">
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="px-error" role="alert">
          <Sprite name="alert" size={12} className="mt-[5px]" />
          <span>{error}</span>
        </p>
      ) : success ? (
        <p id={`${id}-hint`} className="px-success">
          <Sprite name="check" size={12} className="mt-[5px]" />
          <span>{success}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="px-help">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface UniversityPickerProps {
  id: string;
  value: string;
  options: readonly string[];
  invalid?: boolean;
  describedBy?: string;
  onChange(value: string): void;
  onBlur?(): void;
  /** Called with true while the field is in "Other" (free typing) mode. */
  onCustomChange?(custom: boolean): void;
}

/** Lower-case, punctuation-free words, so "uni of moratuwa" finds "University of Moratuwa". */
const words = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * University field: a searchable list of Sri Lankan universities and
 * institutes, with an "Other" choice at the bottom that switches the field to
 * free typing — no list of institutes is ever complete, so nobody is blocked.
 */
export function UniversityPicker({ id, value, options, invalid, describedBy: describedById, onChange, onBlur, onCustomChange }: UniversityPickerProps) {
  const known = useMemo(() => new Map(options.map((option) => [option.toLowerCase(), option])), [options]);
  // A value that isn't in the list (a restored draft, say) means "Other" was already chosen.
  const [custom, setCustom] = useState(() => value.trim() !== "" && !known.has(value.trim().toLowerCase()));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-list`;

  const query = value.trim();
  const matches = useMemo(() => {
    const q = words(query);
    if (!q) return [...options];
    const terms = q.split(" ");
    const starts: string[] = [];
    const contains: string[] = [];
    for (const option of options) {
      const text = words(option);
      if (!terms.every((term) => text.includes(term))) continue;
      (text.startsWith(q) ? starts : contains).push(option);
    }
    return [...starts, ...contains];
  }, [query, options]);

  const exact = known.has(query.toLowerCase());
  const showList = !custom && open && !(exact && matches.length === 1);
  const otherIndex = matches.length; // the "Other" row always comes last
  const rows = matches.length + 1;
  const optionId = (index: number) => (index === otherIndex ? `${id}-option-other` : `${id}-option-${index}`);

  useEffect(() => {
    onCustomChange?.(custom);
  }, [custom, onCustomChange]);

  // Keep the highlighted row visible while moving through a long list with the keyboard.
  useEffect(() => {
    if (showList && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, showList]);

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  /** "Other": keep whatever was typed and let them finish it freely. */
  const chooseOther = () => {
    setCustom(true);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const backToList = () => {
    setCustom(false);
    setOpen(true);
    setActive(-1);
    inputRef.current?.focus();
  };

  const pick = (index: number) => (index === otherIndex ? chooseOther() : choose(matches[index]));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (custom) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % rows);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? rows - 1 : index - 1));
    } else if (event.key === "Enter" && showList && active >= 0) {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  const handleBlur = () => {
    setOpen(false);
    setActive(-1);
    if (query) {
      const canonical = known.get(query.toLowerCase());
      if (canonical) {
        if (canonical !== value) onChange(canonical); // tidy the casing to match the list
        if (custom) setCustom(false); // it is on the list after all
      } else if (!custom) {
        setCustom(true); // typed something new: accept it as "Other"
      }
    }
    onBlur?.();
  };

  const otherLabel = query && !exact ? `Use “${query}” — not on the list` : "Other — my university isn't listed";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        className="px-input"
        type="text"
        role={custom ? undefined : "combobox"}
        aria-expanded={custom ? undefined : showList}
        aria-controls={custom ? undefined : listId}
        aria-autocomplete={custom ? undefined : "list"}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        aria-required="true"
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
        placeholder={custom ? "Full name of your university" : "Search universities…"}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (!custom) {
            setOpen(true);
            setActive(-1);
          }
        }}
        onFocus={() => {
          if (custom) return;
          setOpen(true);
          // On a phone the field can sit low on the screen: lift it so the whole list, "Other" included, fits.
          if (window.matchMedia("(max-width: 767px)").matches) {
            const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            requestAnimationFrame(() => inputRef.current?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }));
          }
        }}
        onClick={() => !custom && setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
      />

      {custom && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-snow-300">
          <span className="px-chip px-chip-ice">Other</span>
          <span>Not on our list — type it as it should appear.</span>
          <button
            type="button"
            className="text-ice-300 underline decoration-2 underline-offset-4 hover:text-white"
            // Keep the field from blurring (and re-flagging "Other") before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={backToList}
          >
            Choose from the list
          </button>
        </p>
      )}

      {!custom && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Universities and institutes"
          hidden={!showList}
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 m-0 max-h-[min(320px,42dvh)] list-none overflow-y-auto bg-night-900 p-1 shadow-[0_0_0_4px_var(--color-gold-400),0_0_0_8px_#04060f,0_12px_0_8px_rgb(0_0_0/0.45)]"
        >
          {matches.length === 0 && (
            <li role="presentation" className="px-3 pb-1 pt-2 text-[0.9375rem] text-snow-400">
              No university on the list matches “{query}”.
            </li>
          )}
          {matches.map((option, index) => (
            <li
              key={option}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              className="flex min-h-[44px] cursor-pointer items-center px-3 py-2 leading-snug text-snow-100 aria-selected:bg-night-600 aria-selected:text-white"
              // Keep focus in the input: mousedown would blur it before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
            >
              {option}
            </li>
          ))}
          {/* Pinned to the bottom of the list, so it is visible without scrolling. */}
          <li
            id={optionId(otherIndex)}
            role="option"
            aria-selected={active === otherIndex}
            className="sticky bottom-0 mt-1 flex min-h-[48px] cursor-pointer items-center gap-3 border-t-[3px] border-night-700 bg-night-900 px-3 py-2 leading-snug text-gold-300 aria-selected:bg-night-600 aria-selected:text-gold-200"
            onMouseDown={(event) => event.preventDefault()}
            onClick={chooseOther}
            onMouseEnter={() => setActive(otherIndex)}
          >
            <Sprite name="edit" size={12} />
            {otherLabel}
          </li>
        </ul>
      )}
    </div>
  );
}
