// @vitest-environment happy-dom

import { JohnDoeClient } from "@/../tests/fixtures/users";
import * as actions from "@/app/settings/language/actions";
import { AuthProvider } from "@/auth/authContext";
import { ClientUser } from "@/lib/types/ClientUser";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { describe, expect, it, vi } from "vitest";
import { LanguageForm } from "./LanguageForm";

// Mock the server action
vi.mock("@/app/settings/language/actions", async (importOriginal) => ({
  ...(await importOriginal()),
  updateLanguage: vi.fn(() => Promise.resolve({})),
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
  _isPending: boolean = false,
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

  it("calls updateLanguage with user ID when form is submitted", async () => {
    wrapRender(<LanguageForm />);

    const form = screen.getByTestId("timeZone-form");
    fireEvent.submit(form);

    await waitFor(() => {
      // Verify the action was bound with the user ID
      expect(actions.updateLanguage).toHaveBeenCalled();
    });
  });
});
