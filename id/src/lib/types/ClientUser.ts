import { UserWithTenant } from "@/db/users";
import { uuidToHumanId } from "@/utils";

export type ClientUser = {
  id: string;
  username: string;
  normalizedUsername: string;
  tenantDomain?: string;
  firstName: string;
  lastName: string | null;
  picture: string | null;
  birthdate: Date | null;
  gender: string;
  genderCustom: string | null;
  pronouns: string;
  passwordBreaches: number | null;
  passwordChangedAt: Date | null;
  hasOtp: boolean;
};

export function makeClientUser(user: UserWithTenant): ClientUser {
  return {
    id: uuidToHumanId(user.id, "usr"),
    username: user.username,
    normalizedUsername: user.normalizedUsername,
    tenantDomain: user.tenant?.domain,
    firstName: user.firstName,
    lastName: user.lastName,
    picture: user.picture,
    birthdate: user.birthdate,
    gender: user.gender,
    genderCustom: user.genderCustom,
    pronouns: user.pronouns,
    passwordBreaches: user.passwordBreaches,
    passwordChangedAt: user.passwordChangedAt,
    hasOtp: user.otpSecret !== null,
  };
}
