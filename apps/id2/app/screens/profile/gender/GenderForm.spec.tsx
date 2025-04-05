// @vitest-environment happy-dom

import { GenderlessUserClient } from "@/../tests/fixtures/users";
import { fireEvent, render, screen } from "@testing-library/react";
import { useLocale } from "use-intl";
import { describe, expect, it, Mock, vi } from "vitest";
import { AuthProvider } from "~/auth/context";
import { ClientUser } from "~/lib/types/ClientUser";
import { GenderForm } from "./GenderForm";

function wrapRender(
  component: React.ReactNode,
  user: Partial<ClientUser> = {},
) {
  return render(
    <AuthProvider
      user={
        {
          ...GenderlessUserClient,
          ...user,
        } as ClientUser
      }
    >
      {component}
    </AuthProvider>,
  );
}

vi.mock("@/app/profile/gender/actions", () => ({
  updateGender: vi.fn(),
}));

describe("GenderForm", () => {
  it("shows the correct gender selected on load", () => {
    wrapRender(<GenderForm />);
    const radio = screen.getByDisplayValue("not_specified");
    expect(radio).toBeChecked();
  });

  it("shows the correct gender selected on load (set)", () => {
    wrapRender(<GenderForm />, { gender: "female" });
    const radio = screen.getByDisplayValue("female");
    expect(radio).toBeChecked();
  });

  it("reveals custom fields when 'custom' is selected", () => {
    wrapRender(<GenderForm />);
    const customRadio = screen.getByDisplayValue("custom");
    fireEvent.click(customRadio);

    expect(screen.getByLabelText("gender.customLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("gender.pronounsLabel")).toBeInTheDocument();

    // Hide the custom fields
    fireEvent.click(screen.getByDisplayValue("male"));
    expect(
      screen.queryByLabelText("gender.customLabel"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByDisplayValue("female"));
    expect(
      screen.queryByLabelText("gender.customLabel"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByDisplayValue("not_specified"));
    expect(
      screen.queryByLabelText("gender.customLabel"),
    ).not.toBeInTheDocument();
  });

  it("shows the pronoun example when a gendered locale is used", () => {
    wrapRender(<GenderForm />);
    fireEvent.click(screen.getByDisplayValue("custom"));
    const select = screen.getByLabelText("gender.pronounsLabel");

    fireEvent.change(select, { target: { value: "female" } });

    expect(screen.getByText("gender.example")).toBeInTheDocument();
  });

  it("hides the pronoun example if locale is non-gendered", () => {
    (useLocale as Mock).mockReturnValue("tr"); // Turkish
    wrapRender(<GenderForm />);
    fireEvent.click(screen.getByDisplayValue("custom"));
    const select = screen.getByLabelText("gender.pronounsLabel");

    fireEvent.change(select, { target: { value: "female" } });

    expect(screen.queryByText("gender.example")).not.toBeInTheDocument();
  });
});
