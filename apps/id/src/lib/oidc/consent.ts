import { OidcClient } from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import { User } from "@/db/users";

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
