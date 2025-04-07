// @vitest-environment happy-dom

import { screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { describe, expect, it } from "vitest";
import SecurityHub from "./Hub";

describe("SecurityHub", () => {
  it("renders the security hub", () => {
    wrapRender(<SecurityHub activeSessions={3} />);

    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("warns about breached password", () => {
    wrapRender(<SecurityHub activeSessions={3} />, {
      passwordBreaches: 42,
    });

    expect(screen.getByText("summary.breaches")).toBeInTheDocument();
  });
});
