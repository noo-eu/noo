import { findTenantByDomainName } from "@/db/tenants";
import { oidcClientRegistration } from "@/lib/oidc/registration";
import { checkVerifier, getBearerToken } from "@/utils";
import { notFound } from "next/navigation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const domain = (await params).domain;
  const tenant = await findTenantByDomainName(domain);
  if (!tenant) {
    notFound();
  }

  if (!tenant.oidcRegistrationTokenDigest) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify the Bearer token against the tenant key
  const token = await getBearerToken();
  if (!token || !checkVerifier(token, tenant.oidcRegistrationTokenDigest)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  return oidcClientRegistration(body, tenant);
}
