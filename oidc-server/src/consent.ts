import configuration, { Client } from "./configuration";
import { Claims } from "./types";

export async function verifyConsent(
  client: Client,
  userId: string,
  scopes: string[],
  claims: Claims,
  strict: boolean = false, // Whether openid must also be consented
) {
  const consent = await configuration.getConsent(client, userId);

  for (const scope of scopes) {
    // Check that the user has consented to each scope (except openid, which is
    // implicitly granted)
    if (!consent.scopes.includes(scope) && (scope !== "openid" || strict)) {
      return false;
    }
  }

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
