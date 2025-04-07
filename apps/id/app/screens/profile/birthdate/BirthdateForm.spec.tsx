// @vitest-environment happy-dom

import { screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it } from "vitest";
import { BirthdateForm } from "./BirthdateForm";

describe("BirthdateForm", () => {
  it("pre-fills fields with state.input values", () => {
    wrapRender(<BirthdateForm />, {
      birthdate: new Date("2000-05-03"),
    });

    expect(screen.getByLabelText("birthdate.day")).toHaveValue("3");
    expect(screen.getByLabelText("birthdate.month")).toHaveValue("5");
    expect(screen.getByLabelText("birthdate.year")).toHaveValue("2000");
  });

  it("renders 12 month options localized", () => {
    wrapRender(<BirthdateForm />);

    const monthSelect = screen.getByLabelText("birthdate.month");
    const options = monthSelect.querySelectorAll("option");

    expect(options).toHaveLength(12);
    expect(options[0]).toHaveValue("1");
    expect(options[11]).toHaveValue("12");
  });
});
