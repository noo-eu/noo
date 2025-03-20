// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import ProfileHub from "./Hub";
import { AuthContext } from "@/auth/authContext";
import { describe, expect, it, vi } from "vitest";
import { ClientUser } from "@/lib/types/ClientUser";

describe("ProfileHub", () => {
  const mockUser = {
    fullName: "John Lennon",
    birthdate: new Date("1958-10-08"),
    gender: "male",
    genderCustom: null,
    picture: "/john.jpg",
    id: "usr_abc123",
    normalizedUsername: "john",
    username: "john",
    firstName: "John",
    lastName: "Lennon",
    pronouns: "male",
    passwordBreaches: 0,
    passwordChangedAt: null,
    hasOtp: false,
  } as ClientUser;

  it("renders user summary fields", () => {
    render(
      <AuthContext.Provider value={mockUser}>
        <ProfileHub />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("summary.name")).toBeInTheDocument();
    expect(screen.getByText("John Lennon")).toBeInTheDocument(); // full name
    expect(screen.getByText("1958-10-08")).toBeInTheDocument(); // formatted birthdate
    expect(screen.getByText("summary.gender")).toBeInTheDocument();
  });
});
