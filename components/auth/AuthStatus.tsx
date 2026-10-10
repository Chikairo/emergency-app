"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthStatus({ email }: { email: string | null }) {
  const router = useRouter();
  if (!email) {
    return (
      <Link
        href="/sign-in"
        className="rounded-full border border-red-200/50 px-3 py-1 text-sm font-semibold text-red-100"
      >
        Staff sign in
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm text-red-100">
      <span className="max-w-40 truncate" title={email}>{email}</span>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
        className="rounded-full border border-red-200/50 px-3 py-1 font-semibold"
      >
        Sign out
      </button>
    </span>
  );
}
