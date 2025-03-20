import { UserWithTenant } from "@/db/users";
import { makeClientUser } from "@/lib/types/ClientUser";

const JohnDoe = {
  id: "12345678-90ab-cdef-1234-567890abcdef",
  firstName: "John",
  lastName: "Doe",
  username: "john.Doe",
  normalizedUsername: "johndoe",
  picture: null,
  birthdate: new Date(),
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

export { JohnDoe, JohnDoeClient, GenderlessUserClient };
