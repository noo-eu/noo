// @vitest-environment happy-dom

import { withAuth } from "@/auth/withAuth";
import { User } from "@/db/users";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/auth/SessionsService", () => ({
  SessionsService: {
    user: userMock,
  },
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
    userMock.mockResolvedValue({
      id: "12345678-90ab-cdef-1234-567890abcdef",
      firstName: "John",
      lastName: "Doe",
      picture: null,
      birthdate: null,
      gender: null,
      genderCustom: null,
      pronouns: null,
      passwordBreaches: null,
      passwordChangedAt: null,
      otpSecret: null,
    });

    const jsx = await WrappedTestPage({
      searchParams: Promise.resolve({ uid: "usr_123" }),
    });
    render(jsx);

    expect(screen.getByTestId("test-user").textContent).toBe("John Doe");
  });
});
