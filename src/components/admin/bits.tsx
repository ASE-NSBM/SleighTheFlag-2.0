"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";
import type { TeamStatus } from "@/lib/types";
import { useDialog } from "./useDialog";

const STATUS: Record<TeamStatus, { label: string; chip: string; icon: SpriteName }> = {
  pending: { label: "Pending", chip: "px-chip-gold", icon: "dots" },
  approved: { label: "Approved", chip: "px-chip-pine", icon: "check" },
  rejected: { label: "Rejected", chip: "px-chip-berry", icon: "close" },
};

/** Status is never colour alone: every chip carries an icon and a word. */
export function StatusChip({ status }: { status: TeamStatus }) {
  const info = STATUS[status];
  return (
    <span className={`px-chip ${info.chip}`}>
      <Sprite name={info.icon} size={12} />
      {info.label}
    </span>
  );
}

export const statusLabel = (status: TeamStatus) => STATUS[status].label;

/** The current time, refreshed every 30 s — keeps "5 min ago" honest without impure renders. */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const interval = window.setInterval(tick, 30_000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(interval);
    };
  }, []);
  return now;
}

interface ConfirmProps {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** A blocking "are you sure?" for destructive actions. */
export function ConfirmDialog({ title, body, confirmLabel, busy, onConfirm, onCancel }: ConfirmProps) {
  const ref = useDialog<HTMLDivElement>(onCancel);
  return (
    <>
      <div className="scrim !z-[120]" onClick={onCancel} aria-hidden="true" />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        tabIndex={-1}
        className="modal px-box px-solid !z-[130] !w-[min(480px,calc(100vw-24px))] p-6 outline-none [--box-border:var(--color-berry-600)]"
      >
        <div className="flex items-start gap-4">
          <Sprite name="bomb" size={48} />
          <div>
            <h2 id="confirm-title" className="adm-h1 !text-[0.875rem]">
              {title}
            </h2>
            <div id="confirm-body" className="mt-3 text-snow-200">
              {body}
            </div>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap justify-end gap-4">
          <button type="button" className="px-btn px-btn-ghost" onClick={onCancel} data-autofocus>
            Cancel
          </button>
          <button type="button" className="px-btn px-btn-danger" onClick={onConfirm} disabled={busy}>
            <Sprite name="trash" size={12} />
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

export function EmptyState({ sprite, title, children }: { sprite: SpriteName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <Sprite name={sprite} size={64} className="float" />
      <p className="adm-h1 !text-[0.8125rem]">{title}</p>
      {children && <div className="max-w-[46ch] text-snow-300">{children}</div>}
    </div>
  );
}
