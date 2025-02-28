import { buildConfiguration } from "@/app/oidc/configuration";
import { findTenantByDomainName } from "@/db/tenants";
import { notFound } from "next/navigation";

export async function GET(request, { params }) {
  const domain = (await params).domain;
  const tenant = await findTenantByDomainName(domain);
  if (!tenant) {
    notFound();
  }

  return Response.json(buildConfiguration(request, domain));
}
