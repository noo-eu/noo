import { render } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { IntlProvider } from "use-intl";
import { vi } from "vitest";
import { AuthProvider } from "~/auth.server/context";
import { ConfirmationProvider } from "~/components/Confirmation";
import type { ClientUser } from "~/types/ClientUser.client";
import { JohnDoeClient } from "./fixtures/users";

export function wrapRender(
  component: React.ReactNode,
  user: Partial<ClientUser> = {},
) {
  const TestComponent = () => (
    <ConfirmationProvider>
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
      </IntlProvider>
    </ConfirmationProvider>
  );

  const actionMock = vi.fn(async () => ({}));
  const Stub = createRoutesStub([
    {
      path: "/test",
      Component: TestComponent,
      action: actionMock,
    },
  ]);

  return {
    component: render(<Stub initialEntries={["/test"]} />),
    actionMock,
  };
}
