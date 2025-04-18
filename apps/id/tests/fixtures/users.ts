import { type UserWithTenant } from "~/db.server/users.server";
import { makeClientUser } from "~/types/ClientUser";

const JohnDoe = {
  id: "12345678-90ab-cdef-1234-567890abcdef",
  firstName: "John",
  lastName: "Doe",
  username: "john.Doe",
  normalizedUsername: "johndoe",
  picture: null,
  birthdate: new Date("1990-01-01"),
  gender: "male",
  genderCustom: null,
  pronouns: "male",
  passwordDigest: "$2b$10$1yZ6",
  passwordChangedAt: new Date(),
  passwordBreaches: 0,
  passwordBreachesCheckedAt: new Date(),
  otpSecret: null,
  webauthnChallenge: null,
  tenant: null,
  tenantId: null,
} as UserWithTenant;

const JohnDoeClient = makeClientUser(JohnDoe);
const GenderlessUserClient = {
  ...JohnDoeClient,
  gender: "not_specified",
  pronouns: "other",
};

export { GenderlessUserClient, JohnDoe, JohnDoeClient };
