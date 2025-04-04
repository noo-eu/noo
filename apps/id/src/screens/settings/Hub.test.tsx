// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsHub } from "./Hub";
import { useAuth } from "@/auth/authContext";
import { LANGUAGE_NAMES } from "@/i18n";
import { displayTz } from "@/lib/timeZones";

// Mock the dependencies
vi.mock("@/auth/authContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/timeZones", () => ({
  displayTz: vi.fn(),
}));

vi.mock("@/components/Profile/ProfileLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="profile-layout">{children}</div>
  ),
}));

vi.mock("../profile/ProfileLink", () => ({
  ProfileLink: ({
    children,
    href,
    title,
    Icon,
  }: {
    children: React.ReactNode;
    href: string;
    title: string;
    Icon: React.ComponentType;
  }) => (
    <div data-testid={`profile-link-${href}`}>
      <span>{title}</span>
      <Icon data-testid="icon" />
      {children}
    </div>
  ),
}));

describe("SettingsHub", () => {
  const mockUser = {
    locale: "en",
    timeZone: "America/New_York",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue(mockUser);
    (displayTz as Mock).mockReturnValue("New York (UTC-5)");
  });

  it("renders the component correctly", () => {
    render(<SettingsHub />);

    expect(screen.getByTestId("profile-layout")).toBeInTheDocument();
    expect(screen.getByText("summary.language")).toBeInTheDocument();
  });

  it("displays the correct links with proper information", () => {
    render(<SettingsHub />);

    // Language link
    const languageLink = screen.getByTestId("profile-link-/settings/language");
    expect(languageLink).toBeInTheDocument();

    // Time zone link
    const timeZoneLink = screen.getByTestId("profile-link-/settings/time-zone");
    expect(timeZoneLink).toBeInTheDocument();
  });

  it("shows the user's language", () => {
    render(<SettingsHub />);

    expect(
      screen.getByText(LANGUAGE_NAMES[mockUser.locale]),
    ).toBeInTheDocument();
  });

  it("shows the user's time zone", () => {
    render(<SettingsHub />);

    expect(displayTz).toHaveBeenCalled();
    expect(screen.getByText("New York (UTC-5)")).toBeInTheDocument();
  });
});
