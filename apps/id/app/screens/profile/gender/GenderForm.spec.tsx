// @vitest-environment happy-dom

import { fireEvent, screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { useLocale } from "use-intl";
import { describe, expect, it, type Mock } from "vitest";
import { GenderForm } from "./GenderForm";

describe("GenderForm", () => {
  it("shows the correct gender selected on load", () => {
    wrapRender(<GenderForm />, { gender: "not_specified" });
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
