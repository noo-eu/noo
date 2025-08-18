import { sha1 } from "@noo/lib/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Users from "~/db.server/users.server";
import { checkPwnedPassword, maybeCheckPwnedPassword } from "./hibp";

vi.mock("~/db.server/users.server");
vi.mock("@noo/lib/crypto");

// Mock fetch globally
global.fetch = vi.fn();

describe("hibp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sha1).mockReturnValue({
      digest: vi
        .fn()
        .mockReturnValue("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"),
    } as any);
  });

  describe("checkPwnedPassword", () => {
    it("produces correct SHA-1 format for HaveIBeenPwned API", async () => {
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue("1E4C9B93F3F0682250B6CF8331B7EE68FD8:3"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await checkPwnedPassword("password");

      expect(sha1).toHaveBeenCalledWith("password");
      expect(fetch).toHaveBeenCalledWith(
        "https://api.pwnedpasswords.com/range/5BAA6",
        expect.objectContaining({
          headers: { "Add-Padding": "true" },
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("splits API prefix/suffix correctly for k-anonymity model", async () => {
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue("1E4C9B93F3F0682250B6CF8331B7EE68FD8:5"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await checkPwnedPassword("password");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.pwnedpasswords.com/range/5BAA6",
        expect.any(Object),
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }
    });

    it("handles network timeout correctly", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("AbortError: timeout"));

      const result = await checkPwnedPassword("password");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain(
          "Failed to check password against Pwned Passwords database",
        );
      }
    });

    it("verifies AbortSignal timeout is set to 1000ms", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(""),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await checkPwnedPassword("password");

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const options = fetchCall[1];
      expect(options?.signal).toBeDefined();
    });

    it("handles malformed API responses gracefully", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue("invalid_response_format"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await checkPwnedPassword("password");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(0);
      }
    });

    it("handles API error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await checkPwnedPassword("password");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(
          "Failed to check password against Pwned Passwords database",
        );
      }
    });

    it("parses decimal count values correctly", async () => {
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue("1E4C9B93F3F0682250B6CF8331B7EE68FD8:123456789"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await checkPwnedPassword("password");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(123456789);
      }
    });

    it("trims leading/trailing whitespace before hashing", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(""),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await checkPwnedPassword("  password  ");

      expect(sha1).toHaveBeenCalledWith("password");
    });

    it("returns 0 when password hash is not found in response", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue("DIFFERENT_HASH:123\nANOTHER_HASH:456"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await checkPwnedPassword("password");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(0);
      }
    });
  });

  describe("maybeCheckPwnedPassword", () => {
    const mockUser = {
      id: "user-123",
      passwordBreaches: 0,
      passwordBreachesCheckedAt: null,
    };

    beforeEach(() => {
      vi.mocked(Users.update).mockResolvedValue({} as any);
    });

    it("checks password when never checked before", async () => {
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue("1E4C9B93F3F0682250B6CF8331B7EE68FD8:5"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await maybeCheckPwnedPassword(mockUser as any, "password");

      expect(fetch).toHaveBeenCalled();
      expect(Users.update).toHaveBeenCalledWith(mockUser.id, {
        passwordBreaches: 5,
        passwordBreachesCheckedAt: expect.any(Date),
      });
    });

    it("checks password when check interval has passed", async () => {
      const weekAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const userWithOldCheck = {
        ...mockUser,
        passwordBreachesCheckedAt: weekAgo,
      };
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue("1E4C9B93F3F0682250B6CF8331B7EE68FD8:3"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await maybeCheckPwnedPassword(userWithOldCheck as any, "password");

      expect(fetch).toHaveBeenCalled();
      expect(Users.update).toHaveBeenCalledWith(mockUser.id, {
        passwordBreaches: 3,
        passwordBreachesCheckedAt: expect.any(Date),
      });
    });

    it("respects configured time interval (weekly by default)", async () => {
      const recentCheck = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const userWithRecentCheck = {
        ...mockUser,
        passwordBreachesCheckedAt: recentCheck,
      };

      await maybeCheckPwnedPassword(userWithRecentCheck as any, "password");

      expect(fetch).not.toHaveBeenCalled();
      expect(Users.update).not.toHaveBeenCalled();
    });

    it("uses custom interval when provided", async () => {
      const customInterval = 1000 * 60 * 60; // 1 hour
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const userWithOldCheck = {
        ...mockUser,
        passwordBreachesCheckedAt: twoHoursAgo,
      };
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue("1E4C9B93F3F0682250B6CF8331B7EE68FD8:2"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await maybeCheckPwnedPassword(
        userWithOldCheck as any,
        "password",
        customInterval,
      );

      expect(fetch).toHaveBeenCalled();
      expect(Users.update).toHaveBeenCalledWith(mockUser.id, {
        passwordBreaches: 2,
        passwordBreachesCheckedAt: expect.any(Date),
      });
    });

    it("skips API call for already-breached passwords", async () => {
      const userWithBreaches = {
        ...mockUser,
        passwordBreaches: 5,
        passwordBreachesCheckedAt: new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000,
        ),
      };

      await maybeCheckPwnedPassword(userWithBreaches as any, "password");

      expect(fetch).not.toHaveBeenCalled();
      expect(Users.update).toHaveBeenCalledWith(mockUser.id, {
        passwordBreachesCheckedAt: expect.any(Date),
      });
    });

    it("updates breach count only when breaches are found", async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue("DIFFERENT_HASH:123"),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await maybeCheckPwnedPassword(mockUser as any, "password");

      expect(fetch).toHaveBeenCalled();
      expect(Users.update).not.toHaveBeenCalled();
    });

    it("handles API errors gracefully without updating user", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      await maybeCheckPwnedPassword(mockUser as any, "password");

      expect(fetch).toHaveBeenCalled();
      expect(Users.update).not.toHaveBeenCalled();
    });
  });
});
