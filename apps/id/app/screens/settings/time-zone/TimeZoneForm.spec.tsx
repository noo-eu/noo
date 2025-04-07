// @vitest-environment happy-dom

import { screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it, vi } from "vitest";
import { TimeZoneForm } from "./TimeZoneForm";

// Mock the timezone utility functions
vi.mock("~/lib.server/timeZones", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    getNormalizedTimeZone: vi.fn().mockReturnValue("CET"),
    displayTz: vi.fn().mockReturnValue("Rome"),
    getSelect: vi.fn().mockReturnValue({
      America: [{ value: "America/New_York", label: "New York" }],
    }),
  };
});

describe("TimeZoneForm", () => {
  it("renders the time zone form with title and description", () => {
    wrapRender(<TimeZoneForm />);

    expect(screen.getByText("label")).toBeInTheDocument();
    expect(screen.getByTestId("timeZone-form")).toBeInTheDocument();
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("renders select field with time zone options", () => {
    wrapRender(<TimeZoneForm />);

    const selectField = screen.getByLabelText("label");
    expect(selectField).toBeInTheDocument();

    // Check that the basic options exist
    expect(screen.getByText("gmt")).toBeInTheDocument();
    expect(screen.getByText("cet")).toBeInTheDocument();
    expect(screen.getByText("eet")).toBeInTheDocument();
  });
});
