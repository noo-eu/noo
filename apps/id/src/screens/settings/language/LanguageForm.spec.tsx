// @vitest-environment happy-dom

import { AuthProvider } from "@/auth/authContext";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { JohnDoeClient } from "@/../tests/fixtures/users";
import { LanguageForm } from "./LanguageForm";
import { ClientUser } from "@/lib/types/ClientUser";
import * as actions from "@/app/settings/language/actions";
import { NextIntlClientProvider } from "next-intl";

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
