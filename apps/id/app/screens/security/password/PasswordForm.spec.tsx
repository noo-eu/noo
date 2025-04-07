// @vitest-environment happy-dom

import { fireEvent, screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it } from "vitest";
import { PasswordForm } from "./PasswordForm";

describe("PasswordForm", () => {
  it("shows password rating and breach warning", async () => {
    wrapRender(<PasswordForm />);
    const input = screen.getByLabelText("password.label");
    fireEvent.change(input, { target: { value: "helloworld" } });
    expect(screen.getByText(/prefix/i)).toBeInTheDocument();
    // Should show one of: weak / acceptable / strong
    expect(screen.getByText(/weak|acceptable|strong/i)).toBeInTheDocument();
  });

  it("shows a breach warning if the current password has been breached", async () => {
    wrapRender(<PasswordForm />, { passwordBreaches: 42 });
    expect(screen.getByText(/password.breaches/i)).toBeInTheDocument();
  });
});
