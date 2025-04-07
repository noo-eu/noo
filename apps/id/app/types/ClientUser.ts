import { uuidToHumanId } from "@noo/lib/humanIds";
import { type UserWithTenant } from "~/db.server/users.server";
import type { ClientUser } from "./ClientUser.client";

export function makeClientUser(user: UserWithTenant): ClientUser {
  const tenantEmail = (user: UserWithTenant) => {
    if (user.tenant!.domain) {
      return `${user.username}@${user.tenant!.domain}`;
    }

    return null;
  };

  return {
    id: uuidToHumanId(user.id, "usr"),
    username: user.username,
    normalizedUsername: user.normalizedUsername,
    tenantDomain: user.tenant?.domain ?? undefined,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName ?? ""}`.trim(),
    picture: user.picture,
    birthdate: user.birthdate,
    gender: user.gender,
    genderCustom: user.genderCustom,
    pronouns: user.pronouns,
    passwordBreaches: user.passwordBreaches,
    passwordChangedAt: user.passwordChangedAt,
    hasOtp: user.otpSecret !== null,
    timeZone: user.timeZone,
    locale: user.locale,

    email: user.tenant
      ? tenantEmail(user)
      : `${user.username}@${process.env.NONSECRET_PUBLIC_MAIL_DOMAIN}`,
    tenant: user.tenant?.name ?? null,
    tenantId: user.tenant?.id ?? null,
  };
}
