import Link from "next/link";
import { LocalStaffSetupForm } from "@/components/auth/LocalStaffSetupForm";
import { isDevelopmentStaffSetupEnabled } from "@/lib/staff-provision";

export const instant = false;

export default function StaffSetupPage() {
  const enabled = isDevelopmentStaffSetupEnabled(
    process.env["NODE_ENV"],
    process.env["DATABASE_URL"],
  );

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-5">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#c51f2b]">
          Staff access
        </p>
        <h1 className="mt-2 text-2xl font-black text-[#142b43]">
          Set up a system administrator account
        </h1>
      </div>
      {enabled ? (
        <LocalStaffSetupForm />
      ) : (
        <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-lg font-extrabold">Local staff setup is disabled</h2>
          <p className="mt-2 text-sm leading-relaxed">
            This page only creates a system administrator account in development when the app is connected
            to a loopback database. The current database configuration does not meet that
            requirement, so no account was created.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Use a local development database and restart the app to enable this form. Regular
            sign-up never grants staff permissions.
          </p>
          <Link
            href="/sign-in"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#142b43] px-4 text-sm font-bold text-white"
          >
            Back to staff sign in
          </Link>
        </section>
      )}
    </main>
  );
}
