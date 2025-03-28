import configuration, { Client, Session } from "@/configuration";
import { createIdToken, idTokenHash } from "@/idToken";
import { AuthorizationRequest } from "@/types";
import { sha256 } from "@/utils";
import { randomBytes } from "node:crypto";

// Creates the response object for the authorization request. This happens after
// the user has consented to the request. The response object may contain an
// authorization code, an access token, an ID token, depending on the
// response_type parameter of the authorization request.
//
// This data is then serialized in different ways depending on the response_mode
// parameter of the authorization request.
export async function buildAuthorizationResponse(
  params: AuthorizationRequest,
  client: Client,
  session: Session,
) {
  const response: Record<string, string> = {};

  const parts = params.response_type.split(" ");

  if (parts.includes("code")) {
    await handleCodeResponseType(params, client, session, response);
  }

  if (parts.includes("token")) {
    await handleTokenResponseType(params, client, session, response);
  }

  if (parts.includes("id_token")) {
    await handleIdTokenResponseType(params, client, session, response);
  }

  response.session_state = await buildSessionState(client, params.redirect_uri);

  return response;
}

async function handleCodeResponseType(
  params: AuthorizationRequest,
  client: Client,
  session: Session,
  response: Record<string, string>,
) {
  const code = await configuration.createOidcAuthorizationCode({
    clientId: client.clientId,
    userId: session.userId,
    redirectUri: params.redirect_uri,
    scopes: params.scopes,
    claims: params.claims,
    nonce: params.nonce,
    authTime: session.lastAuthenticatedAt,
    codeChallenge: params.code_challenge,
    codeChallengeMethod: params.code_challenge_method,
  });

  response.code = code.id;
}

async function handleTokenResponseType(
  params: AuthorizationRequest,
  client: Client,
  session: Session,
  response: Record<string, string>,
) {
  const accessToken = await configuration.createOidcAccessToken({
    clientId: client.clientId,
    userId: session.userId,
    scopes: params.scopes,
    claims: params.claims,
    nonce: params.nonce,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  response.access_token = accessToken.id;
  response.token_type = "Bearer";
  response.expires_in = "3600";
}

async function handleIdTokenResponseType(
  params: AuthorizationRequest,
  client: Client,
  session: Session,
  response: Record<string, string>,
) {
  const c_hash = idTokenHash(client.idTokenSignedResponseAlg, response.code);
  const at_hash = idTokenHash(
    client.idTokenSignedResponseAlg,
    response.access_token,
  );
  const claims = await configuration.getClaims(
    session.userId,
    Object.keys(params.claims.id_token ?? []),
  );

  // TODO: if some claims have specific values, they should be checked here, and:
  // 1. fail the request if the sub claim doesn't match the user id
  // 2. remove the claim from the claims object if it doesn't match

  response.id_token = await createIdToken(client, session.userId, {
    ...claims,
    auth_time: Math.floor(session.lastAuthenticatedAt.getTime() / 1000),
    at_hash,
    c_hash,
    nonce: params.nonce,
  });
}

async function buildSessionState(client: Client, redirectUri: string) {
  const stateValue = await configuration.getSessionStateValue();
  if (!stateValue) {
    // This should never happen, as one can't authorize without a session
    throw new Error("No session check cookie found");
  }

  const origin = new URL(redirectUri).origin;
  const salt = randomBytes(16).toString();

  const state = [client.clientId, origin, stateValue, salt].join(" ");

  return `${sha256(state).digest("base64url")}.${salt}`;
}
