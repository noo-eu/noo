import { NextRequest } from "next/server";
import { findTenantByDomainName } from "@/db/tenants";
import { notFound } from "next/navigation";
import { oidcAuthorization } from "@/lib/oidc/authorization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const domain = (await params).domain;
  const tenant = await findTenantByDomainName(domain);
  if (!tenant) {
    notFound();
  }

  const parameters = Object.fromEntries(request.nextUrl.searchParams);
  return oidcAuthorization(parameters, tenant, request);
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

  const formData = await request.formData();
  const parameters: Record<string, string> = {};
  formData.forEach((value, key) => {
    parameters[key] = value.toString();
  });

  return oidcAuthorization(parameters, tenant, request);
}
