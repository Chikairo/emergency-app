"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { FailureBanner } from "@/components/ui/FailureBanner";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => router.push("/ops"),
        onError: (ctx) => setError(ctx.error.message),
      },
    );
    if (err) setError(err.message ?? "Sign-in failed.");
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="text-lg text-zinc-600">
        Staff accounts only (responders, dispatchers, medical professionals, admins).
        The public emergency flow never requires sign-in.
      </p>
      {error && <FailureBanner title="Sign-in failed" detail={error} />}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="email" className="text-lg font-semibold">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
        />
        <label htmlFor="password" className="mt-4 block text-lg font-semibold">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
        />
        <button
          type="button"
          disabled={pending}
          onClick={signIn}
          className="mt-4 min-h-[56px] w-full rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white hover:bg-[#651414] disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
      <p className="text-lg text-zinc-600">
        No account? <Link href="/sign-up" className="font-semibold text-[#5B1414] underline">Create one</Link> (public role; staff roles are assigned by an administrator).
      </p>
    </div>
  );
}
