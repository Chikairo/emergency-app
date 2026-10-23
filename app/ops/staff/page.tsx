import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffAccessForm } from "@/components/ops/StaffAccessForm";
import { getPageUser } from "@/lib/auth-server";

export const instant = false;

export default async function StaffAccessPage() {
  const user = await getPageUser();
  if (!user) redirect("/sign-in?next=/ops");
  if (user.role !== "SYSTEM_ADMIN") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-[#e7edf4] bg-white p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#c51f2b]">Staff access</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#142b43]">System administrator access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5b7286]">
            This page is limited to system administrators.
          </p>
          <Link href="/ops" className="mt-5 inline-block font-bold text-[#275da8] underline">
            Return to dispatch
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/ops" className="text-sm font-bold text-[#275da8] underline">
        Back to dispatch
      </Link>
      <section className="mt-5 rounded-2xl border border-[#e7edf4] bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#c51f2b]">Staff access</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#142b43]">Grant system administrator access</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5b7286]">
          The staff member must register for an account first. Granting access gives that account
          full dispatch and system administration permissions. Public sign-up never grants staff access.
        </p>
        <StaffAccessForm />
      </section>
    </main>
  );
}
