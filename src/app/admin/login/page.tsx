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

  const code = "data text-white";
  return (
    <div className="mb-6 bg-berry-800/45 px-4 py-4 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
      <p className="text-white">This panel has no password yet, so nobody can sign in.</p>
      {process.env.VERCEL ? (
        // Hosted on Vercel: say exactly where to click.
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            In Vercel, open this project, then <strong>Settings → Environment Variables</strong>.
          </li>
          <li>
            Add <code className={code}>ADMIN_PASSWORD</code> with a password of 8 or more characters, for <strong>Production</strong>.
          </li>
          <li>
            Open <strong>Deployments</strong>, choose <strong>⋯ → Redeploy</strong> on the latest one. The password only takes effect after that.
          </li>
          <li>
            Come back here and sign in as <code className={code}>admin</code> with that password.
          </li>
        </ol>
      ) : (
        <p className="mt-3">
          Set <code className={code}>ADMIN_PASSWORD</code> (8 or more characters) in the server environment — <code className={code}>.env.local</code> when running on
          your own machine — then restart the server.
        </p>
      )}
    </div>
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
