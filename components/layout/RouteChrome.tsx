"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function usesStandaloneLayout(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/sign-in" ||
    pathname === "/staff-setup" ||
    pathname === "/ops" ||
    /\/incidents\/[^/]+\/(waiting|consult)$/.test(pathname)
  );
}

export function RouteChrome({
  children,
  authStatus,
}: {
  children: ReactNode;
  authStatus: ReactNode;
}) {
  const pathname = usePathname() ?? "/";

  if (usesStandaloneLayout(pathname)) return children;

  return (
    <>
      <header className="bg-[#142b43] px-4 py-4 text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-2 w-2 place-items-center rounded-full bg-[#ed343b]" />
            <p className="text-2xl font-bold leading-7">Emergency Care</p>
          </div>
          <span className="rounded-full border border-red-200/50 px-3 py-1 text-sm font-semibold text-red-100">
            MOCK
          </span>
          {authStatus}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 pb-28">
        <main className="flex flex-1 flex-col gap-6">{children}</main>
        <footer className="rounded-2xl bg-[#1e293b] p-5 text-base text-red-50">
          <p className="font-semibold">Emergency Care — demo build (mock services).</p>
          <p className="mt-1">
            Not a replacement for emergency numbers or hospitals. Always call your local
            emergency number directly in a real emergency.
          </p>
        </footer>
      </div>
    </>
  );
}
