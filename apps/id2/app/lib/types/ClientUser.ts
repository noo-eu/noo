import { uuidToHumanId } from "@noo/lib/humanIds";
import { type UserWithTenant } from "~/db/users.server";
import type { ClientUser } from "./ClientUser.client";

export function makeClientUser(user: UserWithTenant): ClientUser {
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
  };
}
