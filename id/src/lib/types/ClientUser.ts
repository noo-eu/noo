import { User, UserWithTenant } from "@/db/users";
import { uuidToHumanId } from "@/utils";

export type ClientUser = {
  id: string;
  username: string;
  normalizedUsername: string;
  tenantDomain?: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  picture: string | null;
  birthdate: Date | null;
  gender: User["gender"];
  genderCustom: string | null;
  pronouns: User["pronouns"];
  passwordBreaches: number | null;
  passwordChangedAt: Date | null;
  hasOtp: boolean;
  timeZone: string;
  locale: string;
};

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
