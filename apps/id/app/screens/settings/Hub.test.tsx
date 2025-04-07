// @vitest-environment happy-dom

import { LANGUAGE_NAMES } from "@noo/lib/i18n";
import { screen } from "@testing-library/react";
import { wrapRender } from "tests/support";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { displayTz } from "~/lib.server/timeZones";
import { SettingsHub } from "./Hub";

vi.mock("~/lib.server/timeZones", () => ({
  displayTz: vi.fn(),
}));

describe("SettingsHub", () => {
  const mockUser = {
    locale: "en",
    timeZone: "America/New_York",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (displayTz as Mock).mockReturnValue("New York (UTC-5)");
  });

  it("renders the component correctly", () => {
    wrapRender(<SettingsHub />, mockUser);

    expect(screen.getByText("summary.language")).toBeInTheDocument();
  });

  it("displays the correct links with proper information", () => {
    wrapRender(<SettingsHub />, mockUser);

    // Language link
    const languageLink = screen.getByTestId("profile-link-/settings/language");
    expect(languageLink).toBeInTheDocument();

    // Time zone link
    const timeZoneLink = screen.getByTestId("profile-link-/settings/time-zone");
    expect(timeZoneLink).toBeInTheDocument();
  });

  it("shows the user's language", () => {
    wrapRender(<SettingsHub />, mockUser);

    expect(
      screen.getByText(LANGUAGE_NAMES[mockUser.locale]),
    ).toBeInTheDocument();
  });

  it("shows the user's time zone", () => {
    wrapRender(<SettingsHub />, mockUser);

    expect(displayTz).toHaveBeenCalled();
    expect(screen.getByText("New York (UTC-5)")).toBeInTheDocument();
  });
});
