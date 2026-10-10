import type { NextRequest } from "next/server";
import { getBundle } from "@/modules/guidance/bundles";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  const bundle = getBundle(slug, locale);
  if (!bundle) {
    return Response.json({ error: `Guidance not found: ${slug}` }, { status: 404 });
  }
  return Response.json({ guidance: bundle });
}
