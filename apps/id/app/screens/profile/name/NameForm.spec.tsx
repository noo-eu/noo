// @vitest-environment happy-dom

import { fireEvent, screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it } from "vitest";
import { NameForm } from "./NameForm";

describe("NameForm", () => {
  it("autocapitalizes names on blur", async () => {
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
    const { actionMock } = wrapRender(<NameForm />);

    actionMock.mockResolvedValue({
      input: {},
      error: { firstName: "tooShort" },
    });

    fireEvent.submit(screen.getByTestId("form"));

    expect(await screen.findByText(/tooShort/i)).toBeInTheDocument();
  });
});
