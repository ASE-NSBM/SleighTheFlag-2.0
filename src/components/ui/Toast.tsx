"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Sprite } from "./Sprite";
import type { SpriteName } from "./sprites";

export interface ToastInput {
  /** Small gold heading, e.g. "Quest complete". */
  title: string;
  body: string;
  sprite?: SpriteName;
  tone?: "info" | "error";
}

interface ToastItem extends ToastInput {
  id: number;
  leaving: boolean;
}

const VISIBLE_MS = 4600;
const EXIT_MS = 260;

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** `const toast = useToast(); toast({ title, body })` */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    timers.current.push(window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), EXIT_MS));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      // Keep the stack short: three at most.
      setToasts((list) => [...list.slice(-2), { ...toast, id, leaving: false }]);
      timers.current.push(window.setTimeout(() => dismiss(id), VISIBLE_MS));
    },
    [dismiss],
  );

  return (
    <ToastContext value={push}>
      {children}
      {/* Polite live region: announced by screen readers without stealing focus. */}
      <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-leaving={toast.leaving} data-tone={toast.tone ?? "info"}>
            <Sprite name={toast.sprite ?? (toast.tone === "error" ? "bomb" : "star")} size={32} />
            <div>
              <div className="toast-title">{toast.title}</div>
              <div className="toast-body">{toast.body}</div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
