// @vitest-environment happy-dom

import { screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it } from "vitest";
import { LanguageForm } from "./LanguageForm";

describe("LanguageForm", () => {
  it("renders the language form with title and description", () => {
    wrapRender(<LanguageForm />);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByTestId("language-picker")).toBeInTheDocument();
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("includes the LanguagePicker with autoSave set to false", () => {
    wrapRender(<LanguageForm />);

    const languagePicker = screen.getByTestId("language-picker");
    expect(languagePicker).toBeInTheDocument();
  });
});
