import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "~/db.server/users.server";
import {
  generateTotp,
  verifyTotpRateLimited,
  verifyTotpWithTolerance,
} from "./totp";

vi.mock("~/db.server", () => ({
  default: {
    transaction: vi.fn(),
  },
}));

vi.mock("~/db.server/key_value_store", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock("~/db.server/advisoryLocks", () => ({
  acquireLockWithUUID: vi.fn(),
  TOTP_LOCK_NAMESPACE: "totp",
}));

import db from "~/db.server";
import { acquireLockWithUUID } from "~/db.server/advisoryLocks";
import KeyValueStore from "~/db.server/key_value_store";

describe("TOTP Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateTotp", () => {
    it("produces RFC 4226 compliant codes", () => {
      const secret = "JBSWY3DPEHPK3PXP"; // Base32 encoded "Hello!"
      const timestamp = 1234567890000; // Fixed timestamp for deterministic testing

      const code = generateTotp(secret, timestamp);

      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
      expect(code).toBe("742275"); // Expected TOTP for this secret/timestamp combination
    });

    it("generates different codes for different timestamps", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const timestamp1 = 1234567890000;
      const timestamp2 = 1234567890000 + 30000; // 30 seconds later

      const code1 = generateTotp(secret, timestamp1);
      const code2 = generateTotp(secret, timestamp2);

      expect(code1).not.toBe(code2);
    });

    it("generates the same code within the same 30-second window", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const baseTime = 1234567890000;

      const code1 = generateTotp(secret, baseTime);
      const code2 = generateTotp(secret, baseTime + 15000); // 15 seconds later
      const code3 = generateTotp(secret, baseTime + 29999); // 29.999 seconds later

      expect(code1).toBe(code2);
      expect(code2).toBe(code3);
    });

    it("supports different digit lengths", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const timestamp = 1234567890000;

      const code4 = generateTotp(secret, timestamp, 4);
      const code8 = generateTotp(secret, timestamp, 8);

      expect(code4).toHaveLength(4);
      expect(code8).toHaveLength(8);
      expect(code4).toMatch(/^\d{4}$/);
      expect(code8).toMatch(/^\d{8}$/);
    });
  });

  describe("verifyTotpWithTolerance", () => {
    const secret = "JBSWY3DPEHPK3PXP";

    it("verifies correct TOTP code at exact timestamp", () => {
      const timestamp = 1234567890000;
      const code = generateTotp(secret, timestamp);

      const isValid = verifyTotpWithTolerance(secret, code, 5, timestamp);

      expect(isValid).toBe(true);
    });

    it("allows for clock skew within tolerance (5 seconds back)", () => {
      const baseTime = 1234567890000;
      const code = generateTotp(secret, baseTime);

      // Verify with timestamp 5 seconds ahead (code generated 5 seconds ago)
      const isValid = verifyTotpWithTolerance(secret, code, 5, baseTime + 5000);

      expect(isValid).toBe(true);
    });

    it("allows for clock skew within tolerance (5 seconds forward)", () => {
      const baseTime = 1234567890000;
      const futureTime = baseTime + 5000;
      const code = generateTotp(secret, futureTime);

      // Verify with past timestamp (code generated 5 seconds in future)
      const isValid = verifyTotpWithTolerance(secret, code, 5, baseTime);

      expect(isValid).toBe(true);
    });

    it("rejects codes beyond tolerance window", () => {
      const baseTime = 1234567890000;
      const code = generateTotp(secret, baseTime);

      // Try to verify with timestamp beyond the 30-second TOTP window + tolerance
      // Since TOTP uses 30-second windows, we need to go beyond 30 + 5 = 35 seconds
      const isValid = verifyTotpWithTolerance(
        secret,
        code,
        5,
        baseTime + 36000,
      );

      expect(isValid).toBe(false);
    });

    it("supports custom tolerance values", () => {
      // Use a time that's at the edge of a TOTP window (:30 seconds)
      const baseTime = 1234567890000;

      // Ensure we're at a time that when we add 8 seconds, we cross into next TOTP window
      const adjustedBaseTime = baseTime + 25000; // 25 seconds into window
      const code = generateTotp(secret, adjustedBaseTime);

      // Should work with 10-second tolerance (covers cross-window)
      const isValid10 = verifyTotpWithTolerance(
        secret,
        code,
        10,
        adjustedBaseTime + 8000,
      );
      expect(isValid10).toBe(true);

      // Should fail with 3-second tolerance when checking 8 seconds later
      const isValid3 = verifyTotpWithTolerance(
        secret,
        code,
        3,
        adjustedBaseTime + 8000,
      );
      expect(isValid3).toBe(false);
    });

    it("works across different time zones", () => {
      // TOTP should be timezone-independent since it uses UTC timestamps
      const utcTimestamp = 1234567890000;
      const code = generateTotp(secret, utcTimestamp);

      // Verification should work regardless of local timezone
      const isValid = verifyTotpWithTolerance(secret, code, 5, utcTimestamp);

      expect(isValid).toBe(true);
    });
  });

  describe("base32 secret decoding", () => {
    it("handles padded base32 strings", () => {
      const paddedSecret = "JBSWY3DPEHPK3PXP"; // Already properly padded

      expect(() => generateTotp(paddedSecret)).not.toThrow();
      const code = generateTotp(paddedSecret, 1234567890000);
      expect(code).toMatch(/^\d{6}$/);
    });

    it("handles unpadded base32 strings", () => {
      const unpaddedSecret = "JBSWY3DPEHPK3PX"; // Missing padding

      expect(() => generateTotp(unpaddedSecret)).not.toThrow();
      const code = generateTotp(unpaddedSecret, 1234567890000);
      expect(code).toMatch(/^\d{6}$/);
    });

    it("handles mixed case base32 strings", () => {
      const mixedCaseSecret = "jbswy3dpehpk3pxp"; // Lowercase
      const upperCaseSecret = "JBSWY3DPEHPK3PXP"; // Uppercase

      const code1 = generateTotp(mixedCaseSecret, 1234567890000);
      const code2 = generateTotp(upperCaseSecret, 1234567890000);

      expect(code1).toBe(code2);
    });

    it("rejects invalid base32 characters with clear errors", () => {
      const invalidSecrets = [
        "INVALID1CHARACTER!", // Contains invalid character !
        "JBSWY3DPEHPK3PX0", // Contains invalid character 0
        "JBSWY3DPEHPK3PX1", // Contains invalid character 1
        "JBSWY3DPEHPK3PX8", // Contains invalid character 8
        "JBSWY3DPEHPK3PX9", // Contains invalid character 9
      ];

      invalidSecrets.forEach((secret) => {
        expect(() => generateTotp(secret)).toThrow(/Invalid base32 character/);
      });
    });
  });

  describe("verifyTotpRateLimited", () => {
    const mockUser: User = {
      id: "user-123",
      otpSecret: "JBSWY3DPEHPK3PXP",
    } as User;

    it("allows valid TOTP on first attempt", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockDestroy = vi.mocked(KeyValueStore.destroy);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );
      mockGet.mockResolvedValue(null); // No existing rate limit data

      const code = generateTotp(mockUser.otpSecret!);
      const result = await verifyTotpRateLimited(mockUser, code);

      expect(result.isOk()).toBe(true);
      expect(mockDestroy).toHaveBeenCalledWith("user-123:totp_rate_limit");
    });

    it("implements exponential backoff delays after failures", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockSet = vi.mocked(KeyValueStore.set);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );

      // Test different failure counts and expected delays
      const testCases = [
        { failures: 0, expectedDelay: 0 },
        { failures: 1, expectedDelay: 0 },
        { failures: 2, expectedDelay: 2 },
        { failures: 3, expectedDelay: 5 },
        { failures: 4, expectedDelay: 10 },
        { failures: 10, expectedDelay: 600 },
        { failures: 11, expectedDelay: 900 },
        { failures: 20, expectedDelay: 900 }, // Max delay
      ];

      for (const { failures, expectedDelay } of testCases) {
        vi.clearAllMocks();
        mockGet.mockResolvedValue({
          failures,
          lock_until: new Date(Date.now() - 1000), // Expired lock
        });

        const invalidCode = "000000";
        await verifyTotpRateLimited(mockUser, invalidCode);

        expect(mockSet).toHaveBeenCalledWith(
          "user-123:totp_rate_limit",
          expect.objectContaining({
            failures: failures + 1,
            lock_until: expect.any(Date),
          }),
          7200, // 2 hours TTL
        );

        const setCall = vi.mocked(KeyValueStore.set).mock.calls[0];
        const lockUntil = (setCall[1] as { lock_until: Date }).lock_until;
        const now = new Date();
        const delayMs = lockUntil.getTime() - now.getTime();
        const delaySeconds = Math.round(delayMs / 1000);

        expect(delaySeconds).toBeCloseTo(expectedDelay, 1);
      }
    });

    it("enforces rate limit locks until expiry time", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockGet = vi.mocked(KeyValueStore.get);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );

      const futureTime = new Date(Date.now() + 60000); // 1 minute in future
      mockGet.mockResolvedValue({
        failures: 5,
        lock_until: futureTime,
      });

      const validCode = generateTotp(mockUser.otpSecret!);
      const result = await verifyTotpRateLimited(mockUser, validCode);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.error).toBe("rate_limit");
        expect(result.error.lockedUntil).toEqual(futureTime);
      }
    });

    it("allows attempts after rate limit lock expires", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockDestroy = vi.mocked(KeyValueStore.destroy);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );

      const pastTime = new Date(Date.now() - 60000); // 1 minute ago
      mockGet.mockResolvedValue({
        failures: 5,
        lock_until: pastTime, // Expired lock
      });

      const validCode = generateTotp(mockUser.otpSecret!);
      const result = await verifyTotpRateLimited(mockUser, validCode);

      expect(result.isOk()).toBe(true);
      expect(mockDestroy).toHaveBeenCalledWith("user-123:totp_rate_limit");
    });

    it("clears failure count on successful verification", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockDestroy = vi.mocked(KeyValueStore.destroy);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );
      mockGet.mockResolvedValue({
        failures: 3,
        lock_until: new Date(Date.now() - 1000), // Expired
      });

      const validCode = generateTotp(mockUser.otpSecret!);
      const result = await verifyTotpRateLimited(mockUser, validCode);

      expect(result.isOk()).toBe(true);
      expect(mockDestroy).toHaveBeenCalledWith("user-123:totp_rate_limit");
    });

    it("acquires advisory locks to prevent concurrent attempts", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockAcquireLock = vi.mocked(acquireLockWithUUID);
      const mockGet = vi.mocked(KeyValueStore.get);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );
      mockGet.mockResolvedValue(null);

      const validCode = generateTotp(mockUser.otpSecret!);
      await verifyTotpRateLimited(mockUser, validCode);

      expect(mockAcquireLock).toHaveBeenCalledWith(
        {}, // transaction object
        "user-123",
        "totp",
      );
    });

    it("handles string timestamps in stored data", async () => {
      const mockTransaction = vi.mocked(db.transaction);
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockDestroy = vi.mocked(KeyValueStore.destroy);

      mockTransaction.mockImplementation(async (callback) =>
        callback({} as any),
      );

      const pastTimeString = new Date(Date.now() - 60000).toISOString();
      mockGet.mockResolvedValue({
        failures: 2,
        lock_until: pastTimeString, // String instead of Date
      });

      const validCode = generateTotp(mockUser.otpSecret!);
      const result = await verifyTotpRateLimited(mockUser, validCode);

      expect(result.isOk()).toBe(true);
      expect(mockDestroy).toHaveBeenCalledWith("user-123:totp_rate_limit");
    });
  });
});
