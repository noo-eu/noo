import { getTenant } from "@/app/oidc/utils";
import OidcClients from "@/db/oidc_clients";
import { HttpRequest } from "@/lib/http/request";
import { oidcClientRegistration } from "@/lib/oidc/registration";
import "@/lib/oidc/setup";
import { checkVerifier, humanIdToUuid } from "@/utils";
import { notFound } from "next/navigation";

export async function POST(
  raw: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const scope = (await params).scope;
  const tenant = await getTenant(scope);
  if (!tenant) {
    notFound();
  }

  if (!tenant.oidcRegistrationTokenDigest) {
    return new Response("Unauthorized", { status: 401 });
  }

  const request = new HttpRequest(raw);

  // Verify the Bearer token against the tenant key
  const token = request.bearerToken;
  if (!token || !checkVerifier(token, tenant.oidcRegistrationTokenDigest)) {
    return new Response("Unauthorized", { status: 401 });
  }

  return oidcClientRegistration(request, tenant);
}

export async function DELETE(
  raw: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const scope = (await params).scope;
  const tenant = await getTenant(scope);
  if (!tenant) {
    notFound();
  }

  const request = new HttpRequest(raw);
  const clientId = request.queryParams.client_id;
  if (!clientId) {
    return new Response("Bad Request", { status: 400 });
  }

  const clientIdRaw = humanIdToUuid(clientId, "oidc");
  if (!clientIdRaw) {
    return new Response("Bad Request", { status: 400 });
  }

  const client = await OidcClients.findWithTenant(clientIdRaw, tenant.id);
  if (!client) {
    return new Response("Not Found", { status: 404 });
  }

  if (!client.registrationAccessTokenDigest) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify the Bearer token against the tenant key
  const token = request.bearerToken;
  if (!token || !checkVerifier(token, client.registrationAccessTokenDigest)) {
    return new Response("Unauthorized", { status: 401 });
  }

  await OidcClients.destroy(client.id);
  return new Response(null, { status: 204 });
}
