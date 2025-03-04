import { UserWithTenant } from "@/db/users";

export function requestedUserClaims(
  requestedClaims: { [key: string]: unknown } | undefined,
  user: UserWithTenant,
) {
  if (!requestedClaims) {
    return {};
  }

  const requests = Object.keys(requestedClaims);
  const claims: Record<string, string | boolean> = {};

  if (requests.includes("name")) {
    claims.name = `${user.firstName} ${user.lastName}`;
  }

  if (requests.includes("given_name")) {
    claims.given_name = user.firstName;
  }

  if (requests.includes("family_name") && user.lastName) {
    claims.family_name = user.lastName;
  }

  if (requests.includes("preferred_username")) {
    claims.preferred_username = user.username;
  }

  if (requests.includes("email")) {
    claims.email = user.username + "@" + (user.tenant?.domain || "noomail.eu");
  }

  if (requests.includes("email_verified")) {
    claims.email_verified = true;
  }

  // TODO: picture, profile, phone_number, address, locale, zoneinfo, updated_at

  return claims;
}
