import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSessionCheckCookie,
  getSessionCookie,
  setSessionCookie,
} from "~/auth.server/sessions/store";

describe("Session cookie store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets session cookie", async () => {
    const value = await getSessionCookie({
      headers: { get: () => "_noo_auth=InJhdy1zZXNzaW9uLWNvb2tpZSI" },
    } as unknown as Request);
    expect(value).toBe("raw-session-cookie");
  });

  it("falls back to empty string", async () => {
    const value = await getSessionCookie({
      headers: { get: () => null },
    } as unknown as Request);
    expect(value).toBe("");
  });

  it("gets check cookie", async () => {
    const value = await getSessionCheckCookie({
      headers: { get: () => "_noo_auth_check=InJhdy1zZXNzaW9uLWNvb2tpZSI" },
    } as unknown as Request);
    expect(value).toBe("raw-session-cookie");
  });

  it("sets session and check cookies", async () => {
    const cookie = "raw-session-cookie";
    const result = await setSessionCookie(cookie);

    expect(result[0]).toBe(
      "_noo_auth=InJhdy1zZXNzaW9uLWNvb2tpZSI%3D; Max-Age=34560000; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    expect(result[1]).toBe(
      "_noo_auth_check=IkRVYXhfdkdHbVltbEdiZUt6eGZGelg5QkRDbkdXa0Joa0ZLck1GZlhSajgi; Max-Age=34560000; Path=/; Secure; SameSite=None",
    );
  });
});
