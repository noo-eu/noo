import { Client, Session } from "../configuration";
import { verifyConsent } from "../consent";
import { buildSubClaim } from "../idToken";
import { AuthorizationRequest, Claims } from "../types";
import { getActiveSessions } from "../utils";
import { returnToClient } from "./finish";
import { AuthorizationResult } from "./request";
import { buildAuthorizationResponse } from "./response";

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
  let sessions = await getActiveSessions(params.max_age);

  /**
   * The spec leaves open a small undefined behaviour. Multiple sessions could
   * be active at the same time at the OP (us). The only way to distinguish
   * between them is by the id_token_hint parameter, which is RECOMMENDED, but
   * not REQUIRED.
   *
   * Our strategy will be as follows:
   *   1. If we have an id_token_hint, we'll use it to find the session.
   *   2. If we don't have an id_token_hint, we'll check which of the active
   *      sessions have consented to the client.
   *   3. If we have multiple sessions that match the criteria, we'll return an
   *      interaction_required error.
   */

  if (params.id_token_hint) {
    // Filter the sessions by the id_token_hint parameter
    sessions = sessions.filter(
      (sess) => buildSubClaim(client, sess.userId) === params.id_token_hint,
    );
  }

  if (sessions.length === 0) {
    return returnToClient(params, { error: "login_required" });
  } else if (sessions.length === 1) {
    const consented = await verifyConsent(
      client,
      sessions[0].userId,
      params.scopes,
      params.claims,
      true,
    );

    if (!consented) {
      return returnToClient(params, { error: "consent_required" });
    }
    const responseParams = await buildAuthorizationResponse(
      params,
      client,
      sessions[0],
    );
    return await returnToClient(params, responseParams);
  }

  const session = await findCompatibleSession(sessions, params, client);

  if (!session) {
    // No, or multiple sessions match the criteria
    return returnToClient(params, { error: "interaction_required" });
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
