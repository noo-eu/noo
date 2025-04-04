// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { useAuth, AuthProvider } from "@/auth/authContext";
import { describe, expect, it } from "vitest";
import { ClientUser } from "@/lib/types/ClientUser";

describe("useAuth", () => {
  it("throws error if used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrowError(
      "useAuth must be used within an AuthProvider",
    );
  });

  it("returns user context if used within AuthProvider", () => {
    const mockUser = {
      id: "usr_123",
      username: "test",
      normalizedUsername: "test",
      firstName: "Test",
      lastName: "User",
      picture: null,
      birthdate: null,
      gender: "male",
      genderCustom: null,
      pronouns: "male",
      passwordBreaches: 0,
      passwordChangedAt: null,
      hasOtp: false,
    } as ClientUser;

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider user={mockUser}>{children}</AuthProvider>
      ),
    });

    expect(result.current).toEqual(mockUser);
  });
});
