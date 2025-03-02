import { findOidcAccessToken } from "@/db/oidc_access_tokens";
import { findOidcClient } from "@/db/oidc_clients";
import { findSessionById } from "@/db/sessions";
import { findTenantById } from "@/db/tenants";
import { findUserById } from "@/db/users";

export async function GET(request: Request) {
  const accessToken = request.headers.get("Authorization");
  if (!accessToken) {
    return new Response(null, { status: 401 });
  }

  const [type, token] = accessToken.split(" ");
  if (type !== "Bearer") {
    return new Response(null, { status: 401 });
  }

  const at = await findOidcAccessToken(token);
  if (!at) {
    return new Response(null, { status: 401 });
  }

  const client = await findOidcClient(at.clientId);
  if (!client) {
    return new Response(null, { status: 401 });
  }

  const tenant = client.tenantId ? await findTenantById(client.tenantId) : null;

  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host");

  let issuer = `${proto}://${host}/oidc`;
  if (tenant) {
    issuer += `/${tenant.domain}`;
  }

  const claims: Record<string, unknown> = {
    iss: issuer,
    sub: at.userId,
    aud: client.id,
    exp: Math.floor(new Date().getTime() / 1000) + 3600,
    iat: Math.floor(new Date().getTime() / 1000),
    nonce: at.nonce,
  };

  const user = (await findUserById(at.userId))!;

  if (at.scopes.includes("profile")) {
    claims.name = `${user.firstName} ${user.lastName}`;
    claims.given_name = user.firstName;
    claims.family_name = user.lastName;
    claims.preferred_username = user.username;
  }

  if (at.scopes.includes("email")) {
    claims.email = user.username + "@" + tenant?.domain || "noomail.eu";
    claims.email_verified = true;
  }

  return Response.json(claims);
}
