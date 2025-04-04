import { Client } from "../configuration";
import { verifyConsent } from "../consent";
import { buildSubClaim } from "../idToken";
import { AuthorizationRequest } from "../types";
import { getActiveSessions } from "../utils";
import { AuthorizationResult } from "./request";

export async function authorizationAny(
  params: AuthorizationRequest,
  client: Client,
): Promise<AuthorizationResult> {
  let sessions = await getActiveSessions(params.max_age);

  /**
   * No specific requirement.
   *
   * Our strategy will be as follows:
   *   - if there's only one active session:
   *     - if the user has not yet consented to the client: show the consent
   *       screen, with the option to switch accounts
   *     - if the user has already consented to the client: show a
   *       confirmation screen, to let the user know what's happening, to
   *       give them a chance to cancel or to switch accounts.
   *   - if there are multiple active sessions: show the account picker.
   *   - if there are no active sessions, show the login screen.
   */

  if (params.id_token_hint) {
    // Filter the sessions by the id_token_hint parameter
    sessions = sessions.filter(
      (sess) => buildSubClaim(client, sess.userId) === params.id_token_hint,
    );
  }

  if (sessions.length === 0) {
    // No active sessions, show redirect to login screen
    return { params, nextStep: "SIGN_IN" };
  } else if (sessions.length > 1) {
    // Multiple active or matching sessions, show account picker
    return { params, nextStep: "SELECT_ACCOUNT" };
  }

  // Only one active session, show consent screen if needed
  const session = sessions[0];

  if (
    await verifyConsent(client, session.userId, params.scopes, params.claims)
  ) {
    // User has already consented, show confirmation screen
    return { params, nextStep: "CONFIRM", userId: session.userId };
  } else {
    // User has not yet consented, show consent screen
    return { params, nextStep: "CONSENT", userId: session.userId };
  }
}
