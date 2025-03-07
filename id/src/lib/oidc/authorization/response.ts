import { RESPONSE_TYPES_SUPPORTED } from "@/app/oidc/configuration";
import OidcAccessTokens from "@/db/oidc_access_tokens";
import OidcAuthorizationCodes from "@/db/oidc_authorization_codes";
import { OidcClient } from "@/db/oidc_clients";
import { Session } from "@/db/sessions";
import { getSessionCheckCookie } from "@/lib/SessionsService";
import { humanIdToUuid, randomSalt, sha256, uuidToHumanId } from "@/utils";
import { createIdToken, idTokenHash } from "../idToken";
import { AuthorizationRequest } from "../types";
import { requestedUserClaims } from "../userClaims";

// Creates the response object for the authorization request. This happens after
// the user has consented to the request. The response object may contain an
// authorization code, an access token, an ID token, depending on the
// response_type parameter of the authorization request.
//
// This data is then serialized in different ways depending on the response_mode
// parameter of the authorization request.
export async function buildAuthorizationResponse(
  client: OidcClient,
  params: AuthorizationRequest,
  session: Session,
) {
  if (!RESPONSE_TYPES_SUPPORTED.includes(params.response_type)) {
    throw new Error("Unsupported or invalid response type");
  }

  const response: Record<string, string> = {};

  const parts = params.response_type.split(" ");

  if (parts.includes("code")) {
    await handleCodeResponseType(params, session, response);
  }

  if (parts.includes("token")) {
    await handleTokenResponseType(client, params, session, response);
  }

  if (parts.includes("id_token")) {
    await handleIdTokenResponseType(client, params, session, response);
  }

  response.session_state = await buildSessionState(
    client.id,
    params.redirect_uri,
  );

  return response;
}

async function handleCodeResponseType(
  params: AuthorizationRequest,
  session: Session,
  response: Record<string, string>,
) {
  const code = await OidcAuthorizationCodes.create({
    id: "oidc_code_" + randomSalt(32, "base64url"),
    clientId: humanIdToUuid(params.client_id, "oidc")!,
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
  client: OidcClient,
  params: AuthorizationRequest,
  session: Session,
  response: Record<string, string>,
) {
  const accessToken = await OidcAccessTokens.create({
    clientId: client.id,
    userId: session.user.id,
    scopes: params.scopes,
    claims: params.claims,
    nonce: params.nonce,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  response.access_token = uuidToHumanId(accessToken.id, "oidc_at");
  response.token_type = "Bearer";
  response.expires_in = "3600";
}

async function handleIdTokenResponseType(
  client: OidcClient,
  params: AuthorizationRequest,
  session: Session,
  response: Record<string, string>,
) {
  const c_hash = idTokenHash(client, response.code);
  const at_hash = idTokenHash(client, response.access_token);
  const user = session.user;

  response.id_token = await createIdToken(
    params.issuer,
    client,
    user.id,
    session.lastAuthenticatedAt,
    {
      ...requestedUserClaims(params.claims.id_token, user),
      nonce: params.nonce,
      at_hash,
      c_hash,
    },
  );
}

async function buildSessionState(clientId: string, redirectUri: string) {
  const checkCookie = await getSessionCheckCookie();
  if (!checkCookie) {
    // This should never happen, as one can't authorize without a session
    throw new Error("No session check cookie found");
  }

  const humanClientId = uuidToHumanId(clientId, "oidc");
  const origin = new URL(redirectUri).origin;
  const salt = randomSalt(16);

  const state = [humanClientId, origin, checkCookie, salt].join(" ");

  return `${sha256(state).digest("base64url")}.${salt}`;
}
