// @vitest-environment happy-dom

import { render, screen, fireEvent } from "@testing-library/react";
import { NameForm } from "./NameForm";
import { vi, describe, it, expect } from "vitest";
import { AuthProvider } from "@/auth/authContext";
import { JohnDoeClient } from "@/../tests/fixtures/users";

function wrapRender(component: React.ReactNode) {
  return render(<AuthProvider user={JohnDoeClient}>{component}</AuthProvider>);
}

describe("NameForm", () => {
  it("autocapitalizes names on blur", async () => {
    const actionMock = vi.fn().mockResolvedValue({ input: {} });

    wrapRender(<NameForm action={actionMock} />);

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
    const actionMock = vi.fn().mockResolvedValue({
      input: {},
      error: { firstName: "tooShort" },
    });

    wrapRender(<NameForm action={actionMock} />);
    fireEvent.submit(screen.getByRole("form"));

    expect(await screen.findByText(/tooShort/i)).toBeInTheDocument();
  });
});
