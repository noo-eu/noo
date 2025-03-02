import { schema } from "@/db";
import {
  deleteOidcAuthorizationCode,
  findOidcAuthorizationCode,
} from "@/db/oidc_authorization_codes";
import { findOidcClient } from "@/db/oidc_clients";
import { findTenantById } from "@/db/tenants";
import { getKeyByAlg } from "../jwks";
import { SignJWT, UnsecuredJWT } from "jose";
import { findSessionById } from "@/db/sessions";
import { createOidcAccessToken } from "@/db/oidc_access_tokens";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parameters: Record<string, string> = {};
  formData.forEach((value, key) => {
    parameters[key] = value.toString();
  });

  switch (parameters.grant_type) {
    case "authorization_code":
      return await authorizationCodeFlow(request, parameters);
    default:
      return Response.json(
        { error: "unsupported_grant_type" },
        { status: 400 },
      );
  }
}

export async function authorizationCodeFlow(
  request: Request,
  parameters: Record<string, string>,
) {
  const code = await findOidcAuthorizationCode(parameters.code);
  if (!code) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const clientId = code.clientId;
  const client = await findOidcClient(clientId);
  if (!client) {
    // Foreign key constraint should prevent this from happening
    return Response.json({ error: "internal_server_error" }, { status: 400 });
  }

  if (!authenticateClient(client, request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // @ts-expect-error
  if (parameters.redirect_uri !== code.data.redirect_uri) {
    // The only exception to the rule is that the redirect_uri may be omitted if
    // the client only uses a single redirect_uri.
    if (
      client.redirectUris.length != 1 ||
      parameters.redirect_uri !== undefined
    ) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
  }

  // Prevent reusing the same code
  await deleteOidcAuthorizationCode(parameters.code);

  // Retrieve the session
  const session = await findSessionById(code.sessionId);
  if (!session) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  // Create and return the access token
  const scopes = code.data.scope?.split(" ") || [];
  const claims = code.data.claims || [];
  const at = await createOidcAccessToken(
    client.id,
    session.userId,
    scopes,
    claims,
    code.data.nonce,
  );

  return Response.json({
    access_token: at.id,
    token_type: "Bearer",
    expires_in: 3600,
    id_token: await createIdToken(request, client, session, {
      // @ts-expect-error
      nonce: code.data.nonce,
    }),
  });
}

async function authenticateClient(
  client: typeof schema.oidcClients.$inferSelect,
  request: Request,
) {
  switch (client.tokenEndpointAuthMethod) {
    case "client_secret_basic":
      return authenticateClientSecretBasic(client, request);
    case "client_secret_post":
      return await authenticateClientSecretPost(client, request);
    case "client_secret_jwt":
    case "private_key_jwt":
    case "none":
      // The Client does not authenticate itself at the Token Endpoint, either
      // because it uses only the Implicit Flow (and so does not use the Token
      // Endpoint) or because it is a Public Client with no Client Secret or
      // other authentication mechanism.
      return true;
    default:
      return false;
  }
}

function authenticateClientSecretBasic(
  client: typeof schema.oidcClients.$inferSelect,
  request: Request,
) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return false;
  }

  const [method, token] = authorization.split(" ");
  if (method !== "Basic") {
    return false;
  }

  const [clientId, clientSecret] = atob(token).split(":");
  return clientId === client.id && clientSecret === client.clientSecret;
}

async function authenticateClientSecretPost(
  client: typeof schema.oidcClients.$inferSelect,
  request: Request,
) {
  const clientId = (await request.formData()).get("client_id");
  const clientSecret = (await request.formData()).get("client_secret");

  return clientId === client.id && clientSecret === client.clientSecret;
}

async function createIdToken(
  request: Request,
  client: typeof schema.oidcClients.$inferSelect,
  session: typeof schema.sessions.$inferSelect,
  additonalClaims: Record<string, unknown> = {},
) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";

  let issuer = `${proto}://${host}/oidc`;
  if (client.tenantId) {
    const domain = (await findTenantById(client.tenantId))?.domain;
    if (!domain) {
      throw new Error("Tenant not found");
    }

    issuer += `/${domain}`;
  }

  const claims = {
    auth_time: Math.floor(session.createdAt.getTime() / 1000),
    ...additonalClaims,
  };

  const alg = client.idTokenSignedResponseAlg;

  if (alg == "none") {
    return new UnsecuredJWT(claims)
      .setIssuer(issuer)
      .setAudience(client.id)
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(session.userId)
      .setJti("jti123")
      .encode();
  } else {
    const { kid, key } = (await getKeyByAlg(alg))!;

    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg, kid })
      .setIssuer(issuer)
      .setAudience(client.id)
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(session.userId)
      .setJti("jti123")
      .sign(key);
  }
}
