"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
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
}

/**
 * Type-ahead for the university: suggests known names but always accepts
 * free text, because no list of institutes is ever complete.
 */
export function UniversityPicker({ id, value, options, invalid, describedBy: describedById, onChange, onBlur }: UniversityPickerProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${id}-list`;

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options.slice(0, 7);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const option of options) {
      const lower = option.toLowerCase();
      if (lower.startsWith(query)) starts.push(option);
      else if (lower.includes(query)) contains.push(option);
    }
    return [...starts, ...contains].slice(0, 7);
  }, [value, options]);

  const exact = matches.length === 1 && matches[0].toLowerCase() === value.trim().toLowerCase();
  const showList = open && matches.length > 0 && !exact;

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (matches.length ? (index + 1) % matches.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (matches.length ? (index <= 0 ? matches.length - 1 : index - 1) : -1));
    } else if (event.key === "Enter" && showList && active >= 0) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        className="px-input"
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        aria-required="true"
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
        placeholder="Start typing — e.g. NSBM Green University"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          onBlur?.();
        }}
        onKeyDown={onKeyDown}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="University suggestions"
        hidden={!showList}
        className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 m-0 max-h-[280px] list-none overflow-y-auto bg-night-900 p-1 shadow-[0_0_0_4px_var(--color-gold-400),0_0_0_8px_#04060f,0_12px_0_8px_rgb(0_0_0/0.45)]"
      >
        {matches.map((option, index) => (
          <li
            key={option}
            id={`${id}-option-${index}`}
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
      </ul>
    </div>
  );
}
