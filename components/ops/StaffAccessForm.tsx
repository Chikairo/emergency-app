"use client";

import { useState, type FormEvent } from "react";

export function StaffAccessForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { email?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? "Staff access could not be updated.");
        return;
      }
      setMessage(`${result.email ?? email.trim()} now has system administrator access.`);
      setEmail("");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <label htmlFor="staff-email" className="text-sm font-semibold text-[#17283c]">
        Registered staff account email
      </label>
      <input
        id="staff-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="min-h-12 rounded-lg border-2 border-[#e7edf4] bg-[#f8fafc] px-4 text-base text-[#17283c] outline-none focus:border-[#ed343b] focus:ring-2 focus:ring-[#ed343b]/30"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-lg bg-[#ed343b] px-5 text-base font-bold text-white hover:bg-[#c51f2b] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Granting access…" : "Grant system administrator access"}
      </button>
      {message && <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
    </form>
  );
}
