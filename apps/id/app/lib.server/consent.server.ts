import type { Claims } from "@noo/oidc-server/types";
import { type OidcClient } from "~/db.server/oidc_clients";
import OidcConsents from "~/db.server/oidc_consents";
import { type User } from "~/db.server/users.server";

// We always implicitly grant these claims, no consent needed
const IMPLICIT_CLAIMS = [
  "acr",
  "amr",
  "azp",
  "aud",
  "auth_time",
  "exp",
  "iat",
  "iss",
  "locale",
  "nonce",
  "sub",
  "updated_at",
  "zoneinfo",
];

const IMPLICIT_SCOPES = ["openid"];

export async function needsConsent(
  client: OidcClient,
  user: User,
  wantedScopes: string[],
  wantedClaims: string[],
) {
  const consent = await OidcConsents.findOrInitialize(client.id, user.id);

  const missingScopes = wantedScopes
    .filter((s) => !consent?.scopes.includes(s))
    .filter((s) => !IMPLICIT_SCOPES.includes(s));

  const missingClaims = wantedClaims
    .filter((c) => !consent?.claims.includes(c))
    .filter((c) => !IMPLICIT_CLAIMS.includes(c));

  return missingScopes.length > 0 || missingClaims.length > 0;
}

export async function storeConsent(
  userId: string,
  clientId: string,
  scopes: string[],
  claims: Claims,
) {
  const claimKeys = Object.keys({ ...claims.userinfo, ...claims.id_token });

  const existing = await OidcConsents.find(clientId, userId);
  if (existing) {
    existing.claims = Array.from(new Set(claimKeys.concat(existing.claims)));
    existing.scopes = Array.from(new Set(scopes.concat(existing.scopes)));
    await OidcConsents.update(clientId, userId, existing);
  } else {
    await OidcConsents.create({
      clientId,
      userId,
      scopes,
      claims: claimKeys,
    });
  }
}
