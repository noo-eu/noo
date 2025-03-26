import { buildConfiguration } from "@/app/oidc/configuration";
import { getTenant } from "@/app/oidc/utils";
import { notFound } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const tenant = await getTenant(params);
  if (!tenant) {
    notFound();
  }

  return Response.json(buildConfiguration(request, tenant.domain));
}
