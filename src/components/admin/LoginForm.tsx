"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Sprite } from "@/components/ui/Sprite";
import { event } from "@/config/event";

export function LoginForm() {
  const expired = useSearchParams().get("expired") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) {
      setError("Enter both the username and the password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (response.ok && data?.ok) {
        // A full navigation, so the server reads the fresh session cookie.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload on purpose: sign-in/out must drop every cached admin screen
        window.location.assign("/admin");
        return;
      }
      setError(data?.error ?? "Sign-in failed. Try again.");
      setPassword("");
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <form className="px-box px-solid snowcap p-7 sm:p-9" onSubmit={submit} noValidate aria-labelledby="login-title">
      <div className="flex flex-col items-center text-center">
        <Sprite name="lock" size={64} className="float" />
        <p className="kicker mt-5">{event.fullName}</p>
        <h1 id="login-title" className="adm-h1 mt-3">
          Control room
        </h1>
        <p className="mt-3 text-snow-300">Organisers only. Sign in to manage registrations.</p>
      </div>

      {expired && !error && (
        <p className="mt-6 bg-night-950/70 px-4 py-3 text-snow-200 shadow-[0_0_0_2px_var(--color-gold-600)]" role="status">
          Your session ended. Sign in again to continue.
        </p>
      )}
      {error && (
        <p className="mt-6 flex gap-3 bg-berry-800/45 px-4 py-3 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
          <Sprite name="alert" size={12} className="mt-[7px]" />
          <span>{error}</span>
        </p>
      )}

      <div className="mt-7 space-y-6">
        <div>
          <label htmlFor="login-user" className="px-label">
            Username
          </label>
          <input
            id="login-user"
            className="px-input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="login-pass" className="px-label">
            Password
          </label>
          <div className="flex gap-4">
            <input
              id="login-pass"
              className="px-input"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="px-btn px-btn-ghost shrink-0" onClick={() => setReveal((value) => !value)} aria-pressed={reveal}>
              {reveal ? "Hide" : "Show"}
              <span className="sr-only"> password</span>
            </button>
          </div>
        </div>
      </div>

      <button type="submit" className="px-btn px-btn-gold mt-8 w-full" disabled={busy}>
        <Sprite name="key" size={16} />
        {busy ? "Unlocking…" : "Unlock"}
      </button>

      <p className="mt-7 text-center text-[0.9375rem]">
        <Link href="/" className="text-snow-400 underline decoration-2 underline-offset-4 hover:text-white">
          ← Back to the event site
        </Link>
      </p>
    </form>
  );
}
