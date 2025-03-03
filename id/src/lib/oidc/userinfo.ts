import Tenants from "@/db/tenants";
import { HttpRequest } from "../http/request";
import { composeMiddleware, cors, preventCache } from "../middlewares";
import { buildSubClaim } from "./idToken";
import { findUserById } from "@/db/users";
import OidcAccessTokens from "@/db/oidc_access_tokens";
import OidcClients from "@/db/oidc_clients";

export const userinfoEndpoint = composeMiddleware(
  preventCache,
  cors(["GET", "POST"]),
  handle,
);

async function getAccessToken(req: HttpRequest) {
  if (req.isPost() && req.isFormData()) {
    const params = await req.formParams;
    if (params.access_token !== undefined) {
      return params.access_token;
    }
  }

  const authHeader = req.authorization;
  if (authHeader !== null) {
    const [type, token] = authHeader.split(" ");
    if (type === "Bearer") {
      return token;
    }
  }
}

async function handle(req: HttpRequest) {
  const token = await getAccessToken(req);
  if (!token) {
    return new Response(null, { status: 401 });
  }

  const at = await OidcAccessTokens.find(token);
  if (!at) {
    return new Response(null, { status: 401 });
  }

  const client = await OidcClients.find(at.clientId);
  if (!client) {
    return new Response(null, { status: 401 });
  }

  let issuer = req.baseUrl;
  const tenant = client.tenantId
    ? await Tenants.find(client.tenantId)
    : undefined;
  if (tenant) {
    issuer += `/${tenant.domain}`;
  }

  const claims: Record<string, unknown> = {
    iss: issuer,
    sub: buildSubClaim(client, at.userId),
    aud: client.id,
    exp: Math.floor(new Date().getTime() / 1000) + 3600,
    iat: Math.floor(new Date().getTime() / 1000),
    nonce: at.nonce,
  };

  const user = (await findUserById(at.userId))!;

  // @ts-ignore
  const requestedClaims = Object.keys(at.claims.userinfo || {});

  if (requestedClaims.includes("name")) {
    claims.name = `${user.firstName} ${user.lastName}`;
  }

  if (requestedClaims.includes("given_name")) {
    claims.given_name = user.firstName;
  }

  if (requestedClaims.includes("family_name")) {
    claims.family_name = user.lastName;
  }

  if (requestedClaims.includes("preferred_username")) {
    claims.preferred_username = user.username;
  }

  if (requestedClaims.includes("email")) {
    claims.email = user.username + "@" + (tenant?.domain || "noomail.eu");
  }

  if (requestedClaims.includes("email_verified")) {
    claims.email_verified = true;
  }

  // TODO: picture, profile, phone_number, address, locale, zoneinfo, updated_at

  // TODO: check client.userinfoSignedResponseAlg. If set, JWT encode the claims

  return Response.json(claims);
}
