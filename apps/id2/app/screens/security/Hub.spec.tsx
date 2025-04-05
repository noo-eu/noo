// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthContext } from "~/auth/context";
import { JohnDoeClient } from "../../../tests/fixtures/users";
import SecurityHub from "./Hub";

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
