import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession, isAdminConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

/** Already signed in? Skip the form. (Reads the session cookie, so it streams inside Suspense.) */
async function SkipIfSignedIn() {
  if (await getAdminSession()) redirect("/admin");
  return null;
}

/** Tells a first-time organiser how to unlock the panel, instead of a login that can never succeed. */
async function SetupNotice() {
  await connection(); // the environment is only meaningful at request time, not at build time
  if (isAdminConfigured()) return null;
  return (
    <p className="mb-6 bg-berry-800/45 px-4 py-3 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
      The panel is locked: set <code className="data text-white">ADMIN_PASSWORD</code> (8+ characters) in the server environment, then restart.
    </p>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <Suspense fallback={null}>
        <SkipIfSignedIn />
      </Suspense>
      <div className="w-full max-w-[440px]">
        <Suspense fallback={null}>
          <SetupNotice />
        </Suspense>
        <Suspense fallback={<div className="px-box px-solid skeleton h-[420px]" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
