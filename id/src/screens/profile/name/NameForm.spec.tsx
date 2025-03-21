// @vitest-environment happy-dom

import { render, screen, fireEvent } from "@testing-library/react";
import { NameForm } from "./NameForm";
import { vi, describe, it, expect } from "vitest";
import { AuthProvider } from "@/auth/authContext";
import { JohnDoeClient } from "@/../tests/fixtures/users";

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
    fireEvent.submit(screen.getByRole("form"));

    expect(await screen.findByText(/tooShort/i)).toBeInTheDocument();
  });
});
