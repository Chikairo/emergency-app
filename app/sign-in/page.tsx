"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { postSignInPath } from "@/lib/authz";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { error: err } = await authClient.signIn.email(
        { email, password },
        {
          onSuccess: async () => {
            const { data, error: sessionError } = await authClient.getSession();
            if (sessionError || !data?.user) {
              setError("Sign-in could not be verified. Please try again.");
              return;
            }
            const role = "role" in data.user ? data.user.role : undefined;
            const requestedPath = new URLSearchParams(window.location.search).get("next");
            router.replace(postSignInPath(typeof role === "string" ? role : "", requestedPath));
            router.refresh();
          },
          onError: (ctx) => setError(ctx.error.message || "Sign-in failed. Check your email and password."),
        },
      );
      if (err) setError(err.message || "Sign-in failed. Check your email and password.");
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Could not reach the sign-in service. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#17283c] font-sans flex flex-col">
      <header className="border-b border-[#e7edf4] bg-white px-4 py-4 sm:px-6 sm:py-[22px]">
        <div className="max-w-[1150px] mx-auto">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#ed343b] text-[22px] text-white">
              ✚
            </div>
            <div>
              <div className="font-black text-lg text-[#142b43]">FirstLink</div>
              <div className="text-[11px] font-medium text-[#718096]">Admin Portal</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 py-7 sm:px-[22px] sm:py-[34px]">
        <div className="rounded-[18px] border border-[#e7edf4] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-[10px] mb-[17px]">
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#ed343b] text-[22px] text-white">
              ✚
            </div>
            <div>
              <div className="font-black text-lg text-[#142b43]">FirstLink</div>
              <div className="text-[11px] font-medium text-[#718096]">Admin Portal</div>
            </div>
          </div>

          <h2 className="text-sm font-bold tracking-wider uppercase text-[#c51f2b] mb-[14px]">
            Staff sign in
          </h2>
          <p className="text-sm text-[#718096] mb-[17px]">
            Sign in with an authorized staff account. Public registration does not grant dispatch access.
          </p>

          {error && (
            <div className="mb-[17px] rounded-[11px] border border-[#f8d7da] bg-[#fdecea] p-[12px] text-sm text-[#c51f2b]" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={signIn}>
            <label htmlFor="email" className="mb-[2px] block text-[12px] font-medium text-[#17283c]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 min-h-[48px] w-full rounded-[11px] border-2 border-[#e7edf4] bg-[#f8fafc] px-4 text-base text-[#17283c] outline-none placeholder:text-[#718096] focus:border-[#ed343b] focus:ring-2 focus:ring-[#ed343b]/30 sm:text-lg"
              placeholder="name@organization.org"
            />
            <label htmlFor="password" className="mb-[2px] mt-[3px] block text-[12px] font-medium text-[#17283c]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 min-h-[48px] w-full rounded-[11px] border-2 border-[#e7edf4] bg-[#f8fafc] px-4 text-base text-[#17283c] outline-none placeholder:text-[#718096] focus:border-[#ed343b] focus:ring-2 focus:ring-[#ed343b]/30 sm:text-lg"
              placeholder="Enter your password"
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-[52px] w-full rounded-[11px] bg-[#ed343b] px-6 text-lg font-bold text-white transition-colors hover:bg-[#c51f2b] disabled:cursor-wait disabled:opacity-70 sm:min-h-[56px] sm:text-[20px]"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="mt-[24px] flex flex-col gap-3 text-center text-sm text-[#718096]">
          <p>
            Need a local development dispatcher account?{" "}
            <Link href="/staff-setup" className="font-semibold text-[#ed343b] underline">
              Create staff account
            </Link>
          </p>
          <p>
            Authorized staff only. Public emergency reporting never requires sign-in.{" "}
            <Link href="/" className="font-semibold text-[#ed343b] underline">
              Return to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
