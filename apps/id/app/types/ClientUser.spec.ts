import { describe, expect, it } from "vitest";
import { type UserWithTenant } from "~/db.server/users.server";
import { makeClientUser } from "./ClientUser";

describe("makeClientUser", () => {
  const userWithTenantMock = {
    id: "12345678-90ab-cdef-1234-567890abcdef",
    username: "testuser",
    normalizedUsername: "testuser",
    firstName: "Test",
    lastName: "User",
    picture: null,
    birthdate: new Date("2000-01-01"),
    gender: "male",
    genderCustom: null,
    pronouns: "male",
    passwordBreaches: 0,
    passwordChangedAt: new Date(),
    otpSecret: "secret",
    passwordDigest: "should-never-leak",

    tenant: null,
    tenantId: null,
    passwordBreachesCheckedAt: null,
    webauthnChallenge: "hello",
  } as UserWithTenant;

  it("maps UserWithTenant to ClientUser", () => {
    const clientUser = makeClientUser(userWithTenantMock);

    expect(clientUser).toEqual(
      expect.objectContaining({
        id: "usr_ylMnxkWlI730ca4YcuUrR",
        username: "testuser",
        normalizedUsername: "testuser",
        tenantDomain: undefined,
        firstName: "Test",
        lastName: "User",
        fullName: "Test User",
        picture: null,
        birthdate: new Date("2000-01-01"),
        gender: "male",
        genderCustom: null,
        pronouns: "male",
        passwordBreaches: 0,
        passwordChangedAt: expect.any(Date),
        hasOtp: true,
      }),
    );
  });

  it("does not leak sensitive fields", () => {
    const clientUser = makeClientUser(userWithTenantMock);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    expect((clientUser as any).passwordDigest).toBeUndefined();
    expect((clientUser as any).otpSecret).toBeUndefined();
    expect((clientUser as any).webauthnChallenge).toBeUndefined();
  });
});
