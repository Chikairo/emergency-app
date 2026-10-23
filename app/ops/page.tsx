import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/auth-server";
import { OPS_ROLES } from "@/lib/authz";
import { apiGet } from "@/lib/server-api";
import { OpsQueue, type OpsIncident } from "@/components/ops/OpsQueue";

export const instant = false;

// Dispatch/system roles only. The incident API independently checks role
// authorization; this page also gives signed-in non-dispatch staff a clear denial.
export default async function OpsPage() {
  const user = await getPageUser();
  if (!user) redirect("/sign-in?next=/ops");
  if (!(OPS_ROLES as readonly string[]).includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6 text-[#17283c]">
        <section className="w-full max-w-lg rounded-2xl border border-[#e7edf4] bg-white p-7 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#c51f2b]">Access restricted</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#142b43]">Dispatcher access required</h1>
          <p className="mt-3 text-sm text-[#5b7286]">
            {user.email} is signed in, but this account does not have an authorized dispatch role.
          </p>
          <Link href="/" className="mt-5 inline-block font-bold text-[#275da8] underline">
            Return to Emergency Care
          </Link>
        </section>
      </main>
    );
  }
  const { incidents } = await apiGet<{ incidents: OpsIncident[] }>("/api/incidents");
  return (
    <OpsQueue
      initial={incidents}
      staffEmail={user.email}
      isSystemAdmin={user.role === "SYSTEM_ADMIN"}
    />
  );
}
