// @vitest-environment happy-dom

import { withAuth } from "@/auth/withAuth";
import { User } from "@/db/users";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JohnDoe } from "../../tests/fixtures/users";

function TestPage({ user }: Readonly<{ user: User }>) {
  return (
    <div data-testid="test-user">
      {user.firstName} {user.lastName}
    </div>
  );
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    // Next.js redirect function throws an error, and it's not commonly
    // returned, so we need to mock it as a function that throws an error
    throw new Error(path);
  }),
}));

const userMock = vi.hoisted(() => {
  return vi.fn();
});

const getFirstAuthenticatedUserId = vi.hoisted(() => {
  return vi.fn();
});

vi.mock("@/auth/sessions", () => ({
  getAuthenticatedUser: userMock,
  getFirstAuthenticatedUserId: getFirstAuthenticatedUserId,
}));

describe("withAuth HOC", () => {
  const WrappedTestPage = withAuth(TestPage);

  it("redirects unauthenticated user", async () => {
    userMock.mockResolvedValue(null);

    await expect(
      WrappedTestPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("/signin");
  });

  it("renders wrapped component with user data", async () => {
    userMock.mockResolvedValue(JohnDoe);

    const jsx = await WrappedTestPage({
      searchParams: Promise.resolve({ uid: "usr_123" }),
    });
    render(jsx);

    expect(screen.getByTestId("test-user").textContent).toBe("John Doe");
  });

  it("redirects to signin if the userId is not recognized", async () => {
    userMock.mockResolvedValue(undefined);

    await expect(
      WrappedTestPage({ searchParams: Promise.resolve({ uid: "usr_123" }) }),
    ).rejects.toThrow("/signin");
  });

  it("sets the uid if it's missing but an user is authenticated", async () => {
    getFirstAuthenticatedUserId.mockResolvedValue("usr_123");

    await expect(
      WrappedTestPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("?uid=usr_123");
  });
});
