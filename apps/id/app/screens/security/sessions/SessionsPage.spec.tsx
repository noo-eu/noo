// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { IntlProvider } from "use-intl";
import { describe, expect, it } from "vitest";
import { JohnDoeClient } from "~/../tests/fixtures/users";
import { AuthProvider } from "~/auth.server/context";
import { type ClientSession } from "~/types/ClientSession.client";
import { type ClientUser } from "~/types/ClientUser.client";
import { SessionsPage } from "./SessionsPage";

// Mock sample sessions
const mockSessions: ClientSession[] = [
  {
    id: "session1",
    ip: "192.168.1.1",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    lastUsedAt: new Date(),
    user: {} as ClientUser,
  },
  {
    id: "session2",
    ip: "192.168.1.2",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    lastUsedAt: new Date(),
    user: {} as ClientUser,
  },
  {
    id: "session3",
    ip: "::ffff:192.168.1.3",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    lastUsedAt: new Date(),
    user: {} as ClientUser,
  },
  {
    id: "session4",
    ip: "::ffff:192.168.1.5",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    lastUsedAt: new Date(),
    user: {} as ClientUser,
  },
];

function wrapRender(
  component: React.ReactNode,
  user: Partial<ClientUser> = {},
) {
  const messages = {
    security: {
      sessions: {
        title: "Active Sessions",
        lastUsed: "Last used {lastUsedAgo}",
        currentSession: "Current session",
      },
    },
    common: {
      back: "Back",
    },
  };

  const TestComponent = (
    <IntlProvider
      locale="en"
      messages={messages}
      now={new Date()}
      formats={{
        dateTime: {
          short: {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        },
      }}
    >
      <AuthProvider
        user={
          {
            ...JohnDoeClient,
            id: "user1",
            ...user,
          } as ClientUser
        }
      >
        {component}
      </AuthProvider>
    </IntlProvider>
  );

  const Stub = createRoutesStub([
    {
      path: "/security/sessions",
      Component: () => {
        return TestComponent;
      },
    },
  ]);

  return render(<Stub initialEntries={["/security/sessions"]} />);
}

describe("SessionsPage", () => {
  it("renders the sessions page title", () => {
    wrapRender(
      <SessionsPage sessions={mockSessions} currentSessionId="session1" />,
    );
    expect(screen.getByText("sessions.title")).toBeInTheDocument();
  });

  it("groups sessions by device type", () => {
    wrapRender(
      <SessionsPage sessions={mockSessions} currentSessionId="session1" />,
    );

    // Check for device group headers based on userAgentToDevice logic
    expect(screen.getByText("macOS desktop")).toBeInTheDocument();
    expect(screen.getByText("Windows desktop")).toBeInTheDocument();
    expect(screen.getByText("iOS mobile")).toBeInTheDocument();
  });

  it("shows 'Current session' badge for the active session", () => {
    wrapRender(
      <SessionsPage sessions={mockSessions} currentSessionId="session1" />,
    );
    expect(screen.getByText("sessions.currentSession")).toBeInTheDocument();
  });

  it("shows clean IP addresses", () => {
    wrapRender(
      <SessionsPage sessions={mockSessions} currentSessionId="session1" />,
    );

    // Regular IP should be displayed as is
    expect(screen.getByText("IP: 192.168.1.1")).toBeInTheDocument();

    // IPv6-mapped IPv4 address should be cleaned
    expect(screen.getByText("IP: 192.168.1.3")).toBeInTheDocument();
    expect(
      screen.queryByText("IP: ::ffff:192.168.1.3"),
    ).not.toBeInTheDocument();
  });

  it("shows browser information", () => {
    wrapRender(
      <SessionsPage sessions={mockSessions} currentSessionId="session1" />,
    );

    // Each session should show its browser type
    expect(screen.getAllByText("Safari")).toHaveLength(4);
  });

  it("doesn't show terminate button for current session", () => {
    wrapRender(
      <SessionsPage sessions={[mockSessions[0]]} currentSessionId="session1" />,
    );

    // Verify there's a current session indicator
    expect(screen.getByText("sessions.currentSession")).toBeInTheDocument();

    // No terminate buttons should be present
    expect(screen.queryByTitle("sessions.terminate")).not.toBeInTheDocument();
  });
});
