"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function LocalStaffSetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) throw new Error(result.error.message || "Account creation failed.");

      const response = await fetch("/api/dev/staff-provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          body.error ??
            "The account was created, but local dispatcher access could not be enabled.",
        );
      }

      const session = await authClient.getSession();
      if (session.error || !session.data?.user) {
        throw new Error("Dispatcher access was enabled, but sign-in could not be verified.");
      }
      router.replace("/ops");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create the local staff account. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-[#e7edf4] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-extrabold text-[#142b43]">Create local dispatcher account</h2>
      <p className="mb-5 mt-2 text-sm leading-relaxed text-[#718096]">
        Development setup only. This account is created with your password and assigned the
        dispatcher role on this local database.
      </p>
      {error && (
        <p
          className="mb-4 rounded-[11px] border border-[#f8d7da] bg-[#fdecea] p-3 text-sm text-[#c51f2b]"
          role="alert"
        >
          {error}
        </p>
      )}
      <form className="grid gap-3" onSubmit={createAccount}>
        <label className="grid gap-1 text-xs font-semibold text-[#17283c]" htmlFor="staff-name">
          Name
          <input
            id="staff-name"
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-12 w-full rounded-[11px] border-2 border-[#e7edf4] bg-[#f8fafc] px-4 text-base font-normal outline-none focus:border-[#ed343b] focus:ring-2 focus:ring-[#ed343b]/30"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#17283c]" htmlFor="staff-email">
          Email address
          <input
            id="staff-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-[11px] border-2 border-[#e7edf4] bg-[#f8fafc] px-4 text-base font-normal outline-none focus:border-[#ed343b] focus:ring-2 focus:ring-[#ed343b]/30"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#17283c]" htmlFor="staff-password">
          Password (10+ characters)
          <input
            id="staff-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded-[11px] border-2 border-[#e7edf4] bg-[#f8fafc] px-4 text-base font-normal outline-none focus:border-[#ed343b] focus:ring-2 focus:ring-[#ed343b]/30"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 min-h-[52px] w-full rounded-[11px] bg-[#ed343b] px-5 text-base font-bold text-white transition-colors hover:bg-[#c51f2b] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Creating local account…" : "Create dispatcher account"}
        </button>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-[#718096]">
        This setup is disabled in production and whenever the configured database is not on
        this computer. It does not create a production staff account.
      </p>
      <Link
        className="mt-4 inline-block text-sm font-semibold text-[#c51f2b] underline"
        href="/sign-in"
      >
        Back to staff sign in
      </Link>
    </section>
  );
}
