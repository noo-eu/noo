import { getKeyByAlg } from "@/app/oidc/jwks";
import OidcAccessTokens from "@/db/oidc_access_tokens";
import OidcClients from "@/db/oidc_clients";
import Tenants from "@/db/tenants";
import { findUserById } from "@/db/users";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import { SignJWT } from "jose";
import { HttpRequest } from "../http/request";
import { composeMiddleware, cors, preventCache } from "../middlewares";
import { buildSubClaim } from "./idToken";
import { requestedUserClaims } from "./userClaims";

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

  const tokenRaw = humanIdToUuid(token, "oidc_at");
  if (!tokenRaw) {
    return new Response(null, { status: 401 });
  }

  const at = await OidcAccessTokens.find(tokenRaw);
  if (!at) {
    return new Response(null, { status: 401 });
  }

  const client = await OidcClients.find(at.clientId);
  if (!client) {
    return new Response(null, { status: 401 });
  }

  let issuer = `${req.baseUrl}/oidc`;
  const tenant = client.tenantId
    ? await Tenants.find(client.tenantId)
    : undefined;
  if (tenant) {
    issuer += `/${tenant.domain}`;
  }

  const user = (await findUserById(at.userId))!;

  const claims: Record<string, unknown> = {
    iss: issuer,
    sub: buildSubClaim(client, at.userId),
    aud: uuidToHumanId(client.id, "oidc"),
    exp: Math.floor(new Date().getTime() / 1000) + 3600,
    iat: Math.floor(new Date().getTime() / 1000),
    ...requestedUserClaims(at.claims.userinfo, user),
  };

  if (client.userinfoSignedResponseAlg) {
    const { kid, key } = (await getKeyByAlg(client.userinfoSignedResponseAlg))!;
    const signed = await new SignJWT(claims)
      .setProtectedHeader({ alg: client.userinfoSignedResponseAlg, kid })
      .sign(key);

    return new Response(signed, {
      headers: {
        "Content-Type": "application/jwt",
      },
    });
  } else {
    return Response.json(claims);
  }
}
