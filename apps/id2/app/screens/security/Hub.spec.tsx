// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import SecurityHub from "./Hub";
import { AuthContext } from "@/auth/authContext";
import { describe, expect, it } from "vitest";
import { JohnDoeClient } from "../../../tests/fixtures/users";

describe("SecurityHub", () => {
  const mockUser = JohnDoeClient;

  it("renders the security hub", () => {
    render(
      <AuthContext.Provider value={mockUser}>
        <SecurityHub activeSessions={3} />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("warns about breached password", () => {
    render(
      <AuthContext.Provider value={{ ...mockUser, passwordBreaches: 1 }}>
        <SecurityHub activeSessions={3} />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("summary.breaches")).toBeInTheDocument();
  });
});
