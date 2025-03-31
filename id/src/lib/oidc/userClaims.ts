import { UserWithTenant } from "@/db/users";

export function requestedUserClaims(user: UserWithTenant, requests: string[]) {
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

  if (!user.tenant || user.tenant.domain) {
    if (requests.includes("email")) {
      claims.email =
        user.username + "@" + (user.tenant?.domain ?? "noomail.eu");
    }

    if (requests.includes("email_verified")) {
      claims.email_verified = true;
    }
  }

  if (requests.includes("picture") && user.picture) {
    claims.picture = user.picture;
  }

  if (requests.includes("locale")) {
    claims.locale = user.locale;
  }

  if (requests.includes("zoneinfo")) {
    claims.zoneinfo = timeZoneToIana(user.timeZone);
  }

  if (requests.includes("updated_at")) {
    claims.updated_at = user.updatedAt.toISOString();
  }

  // TODO: profile, phone_number, address

  return claims;
}

function timeZoneToIana(timeZone: string) {
  switch (timeZone) {
    case "GMT":
    case "WET":
      return "Europe/Lisbon";
    case "CET":
      return "Europe/Brussels";
    case "EET":
      return "Europe/Athens";
    default:
      return timeZone;
  }
}
