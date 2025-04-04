// @vitest-environment happy-dom

import { screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it } from "vitest";
import ProfileHub from "./Hub";

describe("ProfileHub", () => {
  it("renders user summary fields", () => {
    wrapRender(<ProfileHub />);

    expect(screen.getByText("summary.name")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("1990-01-01")).toBeInTheDocument();
    expect(screen.getByText("summary.gender")).toBeInTheDocument();
  });
});
