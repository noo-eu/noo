// @vitest-environment happy-dom

import { JohnDoeClient } from "@/../tests/fixtures/users";
import * as actions from "@/app/settings/time-zone/actions";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "~/auth/context";
import { ClientUser } from "~/lib/types/ClientUser";
import { TimeZoneForm } from "./TimeZoneForm";

// Mock the timezone utility functions
vi.mock("~/lib/timeZones", async (importOriginal) => {
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
    <IntlProvider locale="en">
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
    </IntlProvider>,
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
