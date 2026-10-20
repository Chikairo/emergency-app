// Demo sessions are per-launch and uncached.
export const instant = false;

import { AgencyView } from "./AgencyView";

export default async function DemoAgencyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  return <AgencyView id={id} token={token ?? ""} />;
}
