// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthContext } from "~/auth/context";
import { JohnDoeClient } from "../../../tests/fixtures/users";
import ProfileHub from "./Hub";

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
