import configuration, { Client } from "./configuration";
import { Claims } from "./types";

/**
 * Checks if the user has consented to all requested scopes and claims.
 *
 * By default, the openid scope is considered to be implicitly granted, but this
 * can be changed by setting the `strict` parameter to `true`.
 *
 * @param client - The OIDC client for which the consent is being verified.
 * @param userId - The ID of the user for which the consent is being verified.
 * @param scopes - The scopes being requested.
 * @param claims - The claims object being requested.
 * @param strict - Whether the user must have consented to the openid scope.
 * @returns Whether the user has consented to all requested scopes and claims.
 */
export async function verifyConsent(
  client: Client,
  userId: string,
  scopes: string[],
  claims: Claims,
  strict: boolean = false,
) {
  const consent = await configuration.getConsent(client, userId);

  for (const scope of scopes) {
    // Check that the user has consented to each scope (except openid, which is
    // implicitly granted)
    if (!consent.scopes.includes(scope) && (scope !== "openid" || strict)) {
      return false;
    }
  }

  // Take all keys from both the userinfo and id_token claims objects
  const requestedClaims = Object.keys({
    ...claims.userinfo,
    ...claims.id_token,
  });

  for (const claim of requestedClaims) {
    if (!consent.claims.includes(claim)) {
      return false;
    }
  }

  return true;
}
