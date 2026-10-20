// Demo sessions are per-launch and uncached.
export const instant = false;

import { PatientView } from "./PatientView";

export default async function DemoPatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  return <PatientView id={id} token={token ?? ""} />;
}
