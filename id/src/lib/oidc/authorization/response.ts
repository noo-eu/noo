import { RESPONSE_TYPES_SUPPORTED } from "@/app/oidc/configuration";
import OidcAccessTokens from "@/db/oidc_access_tokens";
import OidcClients from "@/db/oidc_clients";
import { Session } from "@/db/sessions";
import { SESSION_CHECK_COOKIE_NAME } from "@/lib/SessionsService";
import { sha256, uuidToHumanId } from "@/utils";
import { cookies } from "next/headers";
import { AuthorizationRequest, createCode } from "../authorization";
import { createIdToken, idTokenHash } from "../idToken";
import { requestedUserClaims } from "../userClaims";

export async function buildAuthorizationResponse(
  params: AuthorizationRequest,
  session: Session,
) {
  if (!RESPONSE_TYPES_SUPPORTED.includes(params.response_type)) {
    throw new Error("Unsupported response type");
  }

  const parts = params.response_type.split(" ");

  const response: Record<string, string> = {};
  const client = (await OidcClients.find(params.client_id))!;
  const user = session.user;

  if (parts.includes("code")) {
    const code = await createCode(session, params);
    response.code = code.id;
  }

  if (parts.includes("token")) {
    const accessToken = await OidcAccessTokens.create({
      clientId: client.id,
      userId: user.id,
      scopes: params.scopes,
      claims: params.claims,
      nonce: params.nonce,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    response.access_token = uuidToHumanId(accessToken.id, "oidc_at");
    response.token_type = "Bearer";
    response.expires_in = "3600";
  }

  if (parts.includes("id_token")) {
    const c_hash = response.code
      ? idTokenHash(client, response.code)
      : undefined;
    const at_hash = response.access_token
      ? idTokenHash(client, response.access_token)
      : undefined;

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

  response.session_state = await buildSessionState(
    client.id,
    params.redirect_uri,
  );

  return response;
}

export async function buildSessionState(clientId: string, redirectUri: string) {
  const cookieStore = await cookies();
  const checkCookie = cookieStore.get(SESSION_CHECK_COOKIE_NAME)?.value;
  if (!checkCookie) {
    throw new Error("No check session cookie found");
  }

  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
    "base64url",
  );

  const humanClientId = clientId.startsWith("oidc_")
    ? clientId
    : uuidToHumanId(clientId, "oidc");

  const origin = new URL(redirectUri).origin;
  const state = humanClientId + " " + origin + " " + checkCookie + " " + salt;

  return `${sha256(state).digest("base64url")}.${salt}`;
}
