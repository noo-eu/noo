// @vitest-environment happy-dom

import { AuthProvider } from "@/auth/authContext";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { JohnDoeClient } from "@/../tests/fixtures/users";
import { TimeZoneForm } from "./TimeZoneForm";
import { ClientUser } from "@/lib/types/ClientUser";
import * as actions from "@/app/settings/time-zone/actions";
import { NextIntlClientProvider } from "next-intl";

// Mock the timezone utility functions
vi.mock("@/lib/timeZones", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    getNormalizedTimeZone: vi.fn().mockReturnValue("CET"),
    displayTz: vi.fn().mockReturnValue("Rome"),
    getSelect: vi.fn().mockReturnValue({
      America: [{ value: "America/New_York", label: "New York" }],
    }),
  };
});

// Mock the server action
vi.mock("@/app/settings/time-zone/actions", async (importOriginal) => ({
  ...(await importOriginal()),
  updateTimeZone: vi.fn(() => Promise.resolve({ input: {} })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
  redirect: vi.fn(),
}));

function wrapRender(
  component: React.ReactNode,
  user: Partial<ClientUser> = {},
) {
  return render(
    <NextIntlClientProvider locale="en">
      <AuthProvider
        user={
          {
            ...JohnDoeClient,
            ...user,
          } as ClientUser
        }
      >
        {component}
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

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

  it("calls updateTimeZone with user ID when form is submitted", async () => {
    wrapRender(<TimeZoneForm />);

    const form = screen.getByTestId("timeZone-form");
    fireEvent.submit(form);

    await waitFor(() => {
      // Verify the action was called with the user ID
      expect(actions.updateTimeZone).toHaveBeenCalledWith(
        JohnDoeClient.id,
        expect.any(Object),
        expect.any(FormData),
      );
    });
  });
});
