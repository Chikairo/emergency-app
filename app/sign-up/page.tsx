"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { FailureBanner } from "@/components/ui/FailureBanner";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp() {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signUp.email(
      { name: name || email, email, password },
      {
        onSuccess: () => router.push("/"),
        onError: (ctx) => setError(ctx.error.message),
      },
    );
    if (err) setError(err.message ?? "Sign-up failed.");
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Create account</h1>
      <p className="text-lg text-zinc-600">
        Public accounts only. Minimum 10-character password. Never reuse an important password here in development.
      </p>
      {error && <FailureBanner title="Sign-up failed" detail={error} />}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="name" className="text-lg font-semibold">Name</label>
        <input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
        />
        <label htmlFor="email" className="mt-4 block text-lg font-semibold">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
        />
        <label htmlFor="password" className="mt-4 block text-lg font-semibold">Password (10+ characters)</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
        />
        <button
          type="button"
          disabled={pending}
          onClick={signUp}
          className="mt-4 min-h-[56px] w-full rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white hover:bg-[#651414] disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </div>
    </div>
  );
}
