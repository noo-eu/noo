// @vitest-environment happy-dom

import { AuthProvider } from "@/auth/authContext";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, Mock } from "vitest";
import { JohnDoeClient } from "@/../tests/fixtures/users";
import { PasswordForm } from "./PasswordForm";
import { ClientUser } from "@/lib/types/ClientUser";
import * as actions from "@/app/security/password/actions";
import { NextIntlClientProvider } from "next-intl";

vi.mock("@/app/security/password/actions", async (importOriginal) => ({
  ...(await importOriginal()),
  checkBreaches: vi.fn(),
}));

function wrapRender(
  component: React.ReactNode,
  user: Partial<ClientUser> = {},
) {
  const messages = {
    common: {
      passwordField: {
        show: "show",
        ariaLabelShow: "ariaLabelShow",
      },
    },
  };

  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
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

describe("PasswordForm", () => {
  it("shows password rating and breach warning", async () => {
    wrapRender(<PasswordForm />);
    const input = screen.getByLabelText("password.label");
    fireEvent.change(input, { target: { value: "helloworld" } });
    expect(screen.getByText(/prefix/i)).toBeInTheDocument(),
      // Should show one of: weak / acceptable / strong
      expect(screen.getByText(/weak|acceptable|strong/i)).toBeInTheDocument();
  });

  it("shows a breach warning if the current password has been breached", async () => {
    wrapRender(<PasswordForm />, { passwordBreaches: 42 });
    expect(screen.getByText(/password.breaches/i)).toBeInTheDocument();
  });

  it("shows breach warning if checkBreaches returns a hit", async () => {
    (actions.checkBreaches as Mock).mockResolvedValue({ breaches: 42 });
    wrapRender(<PasswordForm />);

    const input = screen.getByLabelText("password.label");
    fireEvent.change(input, { target: { value: "leakedpassword1234" } });

    await waitFor(() =>
      expect(screen.getByText(/breached/i)).toBeInTheDocument(),
    );
  });
});
