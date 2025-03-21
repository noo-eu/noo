// @vitest-environment happy-dom

import { JohnDoeClient } from "@/../tests/fixtures/users";
import { AuthProvider } from "@/auth/authContext";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NameForm } from "./NameForm";

function wrapRender(component: React.ReactNode) {
  return render(<AuthProvider user={JohnDoeClient}>{component}</AuthProvider>);
}

const updateNameMock = vi.hoisted(() => vi.fn());
vi.mock("@/app/profile/name/actions", () => ({
  updateName: updateNameMock,
}));

describe("NameForm", () => {
  it("autocapitalizes names on blur", async () => {
    updateNameMock.mockResolvedValue({ input: {} });

    wrapRender(<NameForm />);

    const firstNameInput = screen.getByLabelText(/firstName/i);
    const lastNameInput = screen.getByLabelText(/lastName/i);

    fireEvent.change(firstNameInput, { target: { value: "MARK" } });
    fireEvent.blur(firstNameInput);

    fireEvent.change(lastNameInput, { target: { value: "de la cruz" } });
    fireEvent.blur(lastNameInput);

    expect((firstNameInput as HTMLInputElement).value).toBe("Mark");
    expect((lastNameInput as HTMLInputElement).value).toBe("de la Cruz");
  });

  it("displays error messages if returned", async () => {
    updateNameMock.mockResolvedValue({
      input: {},
      error: { firstName: "tooShort" },
    });

    wrapRender(<NameForm />);
    fireEvent.submit(screen.getByTestId("form"));

    expect(await screen.findByText(/tooShort/i)).toBeInTheDocument();
  });
});
