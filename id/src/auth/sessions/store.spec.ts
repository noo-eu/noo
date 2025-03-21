import {
  getSessionCheckCookie,
  getSessionCookie,
  SESSION_CHECK_COOKIE,
  SESSION_COOKIE,
  setSessionCookie,
} from "@/auth/sessions/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => {
  let cookiesStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  return {
    cookies: () => cookiesStore,
    __cookiesStore: cookiesStore,
  };
});

vi.mock("@/utils", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    sha256: vi.fn().mockReturnValue({
      digest: () => "hashed-cookie",
    }),
  };
});

// @ts-expect-error this is mocked
import { __cookiesStore as store } from "next/headers";

describe("Session cookie store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets session cookie", async () => {
    store.get.mockImplementation((key: string) => ({
      value: key === SESSION_COOKIE ? "abc123" : undefined,
    }));
    const value = await getSessionCookie();
    expect(value).toBe("abc123");
  });

  it("falls back to empty string", async () => {
    store.get.mockImplementation(() => ({
      value: undefined,
    }));
    const value = await getSessionCookie();
    expect(value).toBe("");
  });

  it("gets check cookie", async () => {
    store.get.mockImplementation((key: string) => ({
      value: key === SESSION_CHECK_COOKIE ? "check123" : undefined,
    }));
    const value = await getSessionCheckCookie();
    expect(value).toBe("check123");
  });

  it("falls back to empty string", async () => {
    store.get.mockImplementation(() => ({
      value: undefined,
    }));
    const value = await getSessionCheckCookie();
    expect(value).toBe("");
  });

  it("sets session and check cookies", async () => {
    const cookie = "raw-session-cookie";
    await setSessionCookie(cookie);

    expect(store.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      cookie,
      expect.any(Object),
    );
    expect(store.set).toHaveBeenCalledWith(
      SESSION_CHECK_COOKIE,
      "hashed-cookie",
      expect.any(Object),
    );
  });
});
