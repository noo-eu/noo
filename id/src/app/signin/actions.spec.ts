import { JohnDoe } from "@/../tests/fixtures/users";
import { signin } from "@/app/signin/actions";
import { reauthenticateSession } from "@/auth/sessions";
import Tenants from "@/db/tenants";
import Users from "@/db/users";
import { uuidToHumanId } from "@/utils";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

const mockSessionService = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getAuthenticatedSession: vi.fn(),
  createSession: vi.fn(),
  reauthenticateSession: vi.fn(),
}));

vi.mock("@/db/users");
vi.mock("@/db/tenants");
vi.mock("@/auth/sessions", () => mockSessionService);
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("next/headers", () => ({
  cookies: () => ({
    set: () => {},
  }),
  headers: () => ({
    get: () => {},
  }),
}));

const getOidcAR = vi.hoisted(() => vi.fn());
vi.mock("@/lib/oidc/utils", () => ({ getOidcAuthorizationRequest: getOidcAR }));

const mockUser = JohnDoe;

const createFormData = (values: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(values).forEach(([key, value]) => fd.append(key, value));
  return fd;
};

describe("signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOidcAR.mockResolvedValue(null);
  });

  it("fails if validation fails", async () => {
    const res = await signin(null, createFormData({}));
    expect(res.error).toBe("validation");
  });

  it("fails with invalid credentials", async () => {
    (Users.authenticate as Mock).mockResolvedValue(null);

    const res = await signin(
      null,
      createFormData({ username: "test", password: "bad" }),
    );

    expect(res.error).toBe("credentials");
    expect(res.input.username).toBe("test");
  });

  it("redirects to /signin/otp if user has otpSecret", async () => {
    (Users.authenticate as Mock).mockResolvedValue({
      ...mockUser,
      otpSecret: "secret",
    });

    await expect(
      signin(null, createFormData({ username: "test", password: "123" })),
    ).rejects.toThrow("/signin/otp");
  });

  it("fails if the authenticated user tenant does not match the tenant for the OIDC request", async () => {
    (Users.authenticate as Mock).mockResolvedValue({
      ...mockUser,
      tenantId: null,
    });

    getOidcAR.mockResolvedValue({
      tenantId: "a-tenant",
      domain: "example.eu",
    });
    (Tenants.find as Mock).mockResolvedValue({
      tenantId: "a-tenant",
      domain: "example.eu",
    });

    // User has no tenant, but the OIDC request is for a tenanted client

    const res = await signin(
      null,
      createFormData({ username: "test", password: "123" }),
    );

    expect(res.error).toBe("tenant");
    expect(res.input.domain).toBe("example.eu");
  });

  it("redirects to / if login succeeds without OIDC", async () => {
    (Users.authenticate as Mock).mockResolvedValue(mockUser);

    await expect(
      signin(null, createFormData({ username: "test", password: "123" })),
    ).rejects.toThrow("/");
  });

  it("redirects to /oidc/consent if login succeeds with OIDC", async () => {
    (Users.authenticate as Mock).mockResolvedValue(mockUser);
    getOidcAR.mockResolvedValue({});

    await expect(
      signin(null, createFormData({ username: "test", password: "123" })),
    ).rejects.toThrow(`/oidc/consent?uid=${uuidToHumanId(mockUser.id, "usr")}`);
  });

  it("updates the active session if the user is already authenticated", async () => {
    (Users.authenticate as Mock).mockResolvedValue(mockUser);
    mockSessionService.getAuthenticatedSession.mockResolvedValue({
      userId: mockUser.id,
    });

    await expect(
      signin(null, createFormData({ username: "test", password: "123" })),
    ).rejects.toThrow("/");

    expect(reauthenticateSession).toHaveBeenCalled();
  });
});
