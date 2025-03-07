import { buildConfiguration } from "@/app/oidc/configuration";
import { getTenant } from "@/oidc/utils";
import { notFound } from "next/navigation";

export async function GET(request, { params }) {
  const tenant = await getTenant(params);
  if (!tenant) {
    notFound();
  }

  return Response.json(buildConfiguration(request, tenant.domain));
}
