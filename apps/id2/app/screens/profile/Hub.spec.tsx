// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import ProfileHub from "./Hub";
import { AuthContext } from "@/auth/authContext";
import { describe, expect, it } from "vitest";
import { JohnDoeClient } from "../../../tests/fixtures/users";

describe("ProfileHub", () => {
  const mockUser = JohnDoeClient;

  it("renders user summary fields", () => {
    render(
      <AuthContext.Provider value={mockUser}>
        <ProfileHub />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("summary.name")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument(); // full name
    expect(screen.getByText("1990-01-01")).toBeInTheDocument(); // formatted birthdate
    expect(screen.getByText("summary.gender")).toBeInTheDocument();
  });
});
