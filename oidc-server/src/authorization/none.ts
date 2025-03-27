import configuration, { Client, Session } from "@/configuration";
import { buildSubClaim } from "@/idToken";
import { AuthorizationRequest, Claims } from "@/types";
import { buildAuthorizationResponse } from "./response";
import { AuthorizationResult } from "./request";
import { returnToClient } from "./finish";
import { verifyConsent } from "@/consent";

export async function authorizationNone(
  params: AuthorizationRequest,
  client: Client,
): Promise<AuthorizationResult> {
  // The RP expects the user to be already authenticated and consented.
  // If this is not the case, the request is rejected.
  const sessions = await configuration.getActiveSessions();

  if (sessions.length === 0) {
    return returnToClient(params, { error: "login_required" });
  } else {
    const session = await findCompatibleSession(sessions, params, client);

    if (!session) {
      // No, or multiple sessions match the criteria
      return returnToClient(params, { error: "interaction_required" });
    } else if (
      params.max_age &&
      Date.now() - session.lastAuthenticatedAt.getTime() > params.max_age * 1000
    ) {
      // We found a session, but it's too old
      return returnToClient(params, { error: "login_required" });
    } else if (
      !(await verifyConsent(
        client,
        session.userId,
        params.scopes,
        params.claims,
        true,
      ))
    ) {
      // The user has not yet consented to the client
      return returnToClient(params, { error: "consent_required" });
    } else {
      const responseParams = await buildAuthorizationResponse(
        params,
        client,
        session,
      );

      return await returnToClient(params, responseParams);
    }
  }
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
