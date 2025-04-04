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
 * @param strict - Require consent even to the implicitly granted scopes and
 * claims.
 * @returns Whether the user has consented to all requested scopes and claims.
 */
export async function verifyConsent(
  client: Client,
  userId: string,
  wantedScopes: string[],
  wantedClaims: Claims,
  strict: boolean = false,
) {
  const consent = await getConsent(client, userId);

  const missingScopes = wantedScopes
    .filter((s) => !consent.scopes.includes(s))
    .filter((s) => strict || !configuration.grantedScopes.includes(s));

  const requestedClaims = Object.keys({
    ...wantedClaims.userinfo,
    ...wantedClaims.id_token,
  });

  const missingClaims = requestedClaims
    .filter((c) => !consent.claims.includes(c))
    .filter((c) => strict || !configuration.grantedClaims.includes(c));

  return missingScopes.length === 0 && missingClaims.length === 0;
}

async function getConsent(client: Client, userId: string) {
  try {
    return await configuration.getConsent(client, userId);
  } catch (error) {
    console.error("Error getting consent:", error);
    return {
      scopes: [],
      claims: [],
    };
  }
}
