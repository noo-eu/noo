import { findTenantByDomainName } from "@/db/tenants";
import { notFound } from "next/navigation";
import { oidcAuthorization } from "@/lib/oidc/authorization";
import { HttpRequest } from "@/lib/http/request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const domain = (await params).domain;
  const tenant = await findTenantByDomainName(domain);
  if (!tenant) {
    notFound();
  }

  return oidcAuthorization(new HttpRequest(request), tenant);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const domain = (await params).domain;
  const tenant = await findTenantByDomainName(domain);
  if (!tenant) {
    notFound();
  }

  return oidcAuthorization(new HttpRequest(request), tenant);
}
