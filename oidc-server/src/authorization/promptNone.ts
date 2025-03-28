import configuration, { Client, Session } from "@/configuration";
import { buildSubClaim } from "@/idToken";
import { AuthorizationRequest, Claims } from "@/types";
import { buildAuthorizationResponse } from "./response";
import { AuthorizationResult } from "./request";
import { returnToClient } from "./finish";
import { verifyConsent } from "@/consent";

/**
 * Performs the authorization request with prompt=none, which means that the
 * user should not be prompted for consent or authentication. This is only
 * possible if the user has an active session and has already consented to the
 * client.
 *
 * @param params - The authorization request parameters.
 * @param client - The OIDC client for which the authorization is being
 * performed.
 * @returns - A result containing the next step in the authorization process.
 *   For this step, the next step will always be to return the response to the
 *   client, but the response may be an error.
 */
export async function authorizationNone(
  params: AuthorizationRequest,
  client: Client,
): Promise<AuthorizationResult> {
  const sessions = await configuration.getActiveSessions(params.max_age);

  if (sessions.length === 0) {
    return returnToClient(params, { error: "login_required" });
  }

  const session = await findCompatibleSession(sessions, params, client);

  if (!session) {
    // No, or multiple sessions match the criteria
    return returnToClient(params, { error: "interaction_required" });
  }

  const consented = await verifyConsent(
    client,
    session.userId,
    params.scopes,
    params.claims,
    true,
  );

  if (!consented) {
    // The user has not yet consented to the client
    return returnToClient(params, { error: "consent_required" });
  }

  const responseParams = await buildAuthorizationResponse(
    params,
    client,
    session,
  );

  return await returnToClient(params, responseParams);
}

async function findCompatibleSession(
  sessions: Session[],
  params: AuthorizationRequest,
  client: Client,
): Promise<Session | undefined> {
  // The spec leaves open a small undefined behaviour. Multiple sessions
  // could be active at the same time at the OP (us). The only way to
  // distinguish between them is by the id_token_hint parameter, which is
  // RECOMMENDED, but not REQUIRED.
  //
  // Our strategy will be as follows:
  //   1. If we have an id_token_hint, we'll use it to find the session.
  //   2. If we don't have an id_token_hint, we'll check which of the
  //      active sessions have consented to the client.
  //   3. If we have multiple sessions that match the criteria, we'll
  //      return an interaction_required error.

  if (params.id_token_hint) {
    return await sessions.find(
      (sess) => buildSubClaim(client, sess.userId) === params.id_token_hint,
    );
  } else {
    const matches = await getConsentingSessions(
      client,
      sessions,
      params.scopes,
      params.claims,
    );

    if (matches.length == 1) {
      return matches[0];
    }
  }
}

async function getConsentingSessions(
  client: Client,
  sessions: Session[],
  scopes: string[],
  claims: Claims,
) {
  let matches = [];
  for (const sess of sessions) {
    if (await verifyConsent(client, sess.userId, scopes, claims, true)) {
      matches.push(sess);
    }
  }

  return matches;
}
