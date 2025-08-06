import { describe, expect, it, beforeEach, vi } from "vitest";
import { jwtVerify, SignJWT } from "jose";
import crypto from "crypto";
import {
  getCurrentPowStatus,
  buildPowRequest,
  markSigninFailure,
  withPow,
} from "./signin.pow";
import db from "~/db.server";
import KeyValueStore from "~/db.server/key_value_store";
import { getSigningKey } from "./jwks";

// Mock dependencies
vi.mock("~/db.server", () => ({
  default: {
    transaction: vi.fn(),
  },
}));

vi.mock("~/db.server/key_value_store", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("./jwks", () => ({
  getSigningKey: vi.fn(),
  getVerifyingKeyForJwt: vi.fn(),
}));

vi.mock("./http", () => ({
  getClientIp: vi.fn(() => "192.168.1.100"),
}));

vi.mock("~/db.server/advisoryLocks", () => ({
  acquireLock: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
  SignJWT: vi.fn(),
}));

describe("PoW Anti-Brute-Force System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentPowStatus", () => {
    it("returns default status for new IP", async () => {
      const mockGet = vi.mocked(KeyValueStore.get);
      mockGet.mockResolvedValue(null);

      const request = new Request("https://example.com/signin");
      const result = await getCurrentPowStatus(request);

      expect(result.difficulty).toBe(0);
      expect(result.failures).toBe(0);
      expect(mockGet).toHaveBeenCalledWith("192.168.1.100:pow", undefined);
    });

    it("returns existing status for known IP", async () => {
      const mockGet = vi.mocked(KeyValueStore.get);
      mockGet.mockResolvedValue({
        failures: 5,
        difficulty: 18,
        last_failure: new Date().toISOString(), // Recent failure, no decay
      });

      const request = new Request("https://example.com/signin");
      const result = await getCurrentPowStatus(request);

      expect(result.difficulty).toBe(18);
      expect(result.failures).toBe(5);
    });

    it("decays difficulty over time", async () => {
      const now = new Date();
      const lastFailure = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      const mockGet = vi.mocked(KeyValueStore.get);
      mockGet.mockResolvedValue({
        failures: 5,
        difficulty: 19,
        last_failure: lastFailure.toISOString(),
      });

      const request = new Request("https://example.com/signin");
      const result = await getCurrentPowStatus(request);

      // Should decay by 2 steps (5min / 2min = 2.5, floored = 2)
      expect(result.difficulty).toBe(17);
    });
  });

  describe("buildPowRequest", () => {
    it("creates a valid JWT-signed PoW challenge", async () => {
      const mockKey = crypto.generateKeyPairSync("ed25519");
      const mockGetSigningKey = vi.mocked(getSigningKey);

      // Create a proper SignJWT mock
      const mockSignJWTInstance = {
        setProtectedHeader: vi.fn().mockReturnThis(),
        setIssuedAt: vi.fn().mockReturnThis(),
        setIssuer: vi.fn().mockReturnThis(),
        setAudience: vi.fn().mockReturnThis(),
        setJti: vi.fn().mockReturnThis(),
        setExpirationTime: vi.fn().mockReturnThis(),
        sign: vi.fn().mockResolvedValue("mock.jwt.token"),
      };

      const { SignJWT } = await import("jose");
      vi.mocked(SignJWT).mockReturnValue(mockSignJWTInstance as any);

      mockGetSigningKey.mockResolvedValue({
        key: {} as any, // Mock the key
        kid: "test-kid",
      });

      const challenge = await buildPowRequest(17);

      expect(typeof challenge).toBe("string");
      expect(challenge).toBe("mock.jwt.token");
      expect(mockSignJWTInstance.setProtectedHeader).toHaveBeenCalledWith({
        alg: "EdDSA",
        kid: "test-kid",
      });
      expect(mockSignJWTInstance.setIssuer).toHaveBeenCalledWith("signin-pow");
      expect(mockSignJWTInstance.setAudience).toHaveBeenCalledWith(
        "signin-pow",
      );
    });
  });

  describe("markSigninFailure", () => {
    it("increments failure count and sets difficulty on threshold", async () => {
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockSet = vi.mocked(KeyValueStore.set);
      const mockTransaction = vi.mocked(db.transaction);

      mockGet.mockResolvedValue({
        failures: 2,
        difficulty: 0,
        last_failure: new Date(),
      });

      mockTransaction.mockImplementation(async (callback) => {
        return callback({} as any);
      });

      const request = new Request("https://example.com/signin");
      await markSigninFailure(request, {} as any);

      expect(mockSet).toHaveBeenCalledWith(
        "192.168.1.100:pow",
        expect.objectContaining({
          failures: 3,
          difficulty: 17, // INITIAL_DIFFICULTY
        }),
        3600,
        {},
      );
    });

    it("increases difficulty for subsequent failures", async () => {
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockSet = vi.mocked(KeyValueStore.set);

      mockGet.mockResolvedValue({
        failures: 4,
        difficulty: 17,
        last_failure: new Date(),
      });

      const request = new Request("https://example.com/signin");
      await markSigninFailure(request, {} as any);

      expect(mockSet).toHaveBeenCalledWith(
        "192.168.1.100:pow",
        expect.objectContaining({
          failures: 5,
          difficulty: 18, // Increased by 1
        }),
        3600,
        {},
      );
    });

    it("caps difficulty at maximum", async () => {
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockSet = vi.mocked(KeyValueStore.set);

      mockGet.mockResolvedValue({
        failures: 10,
        difficulty: 20, // MAX_DIFFICULTY
        last_failure: new Date(),
      });

      const request = new Request("https://example.com/signin");
      await markSigninFailure(request, {} as any);

      expect(mockSet).toHaveBeenCalledWith(
        "192.168.1.100:pow",
        expect.objectContaining({
          failures: 11,
          difficulty: 20, // Should not exceed MAX_DIFFICULTY
        }),
        3600,
        {},
      );
    });
  });

  describe("PoW Verification Algorithm", () => {
    it("correctly verifies a valid PoW solution", async () => {
      // Create a test challenge
      const challenge = "deadbeef".repeat(16); // 64-byte hex challenge
      const difficulty = 12; // Reasonable test difficulty

      // Find a valid nonce by brute force (for testing)
      let nonce = 0;
      let validNonce: number | null = null;

      while (nonce < 100000 && validNonce === null) {
        const challengeBuffer = Buffer.from(challenge, "hex");
        const nonceBuffer = Buffer.allocUnsafe(4);
        nonceBuffer.writeUInt32BE(nonce, 0);

        const combined = Buffer.concat([challengeBuffer, nonceBuffer]);
        const hash = crypto.createHash("sha256").update(combined).digest();

        // Check leading zero bits
        let zeroBits = 0;
        for (let i = 0; i < hash.length; i++) {
          const byte = hash[i];
          if (byte === 0) {
            zeroBits += 8;
          } else {
            let mask = 0x80;
            while (mask && !(byte & mask)) {
              zeroBits++;
              mask >>= 1;
            }
            break;
          }
          if (zeroBits >= difficulty) break;
        }

        if (zeroBits >= difficulty) {
          validNonce = nonce;
        }
        nonce++;
      }

      expect(validNonce).not.toBeNull();

      // Now test our verification function by importing it directly
      // Since verifyPow is not exported, we need to test it indirectly through withPow
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockTransaction = vi.mocked(db.transaction);

      // Mock that we need PoW verification
      mockGet.mockImplementation(async (key) => {
        if (key === "192.168.1.100:pow") {
          return {
            failures: 5,
            difficulty: difficulty,
            last_failure: new Date(),
          };
        }
        if (key.startsWith("pow:")) {
          return null; // Challenge not used before
        }
        return null;
      });

      mockTransaction.mockImplementation(async (callback) => {
        return callback({} as any);
      });

      // Mock JWT verification
      const { jwtVerify } = await import("jose");
      const { getVerifyingKeyForJwt } = await import("./jwks");

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          challenge: challenge,
          difficulty: difficulty,
          algorithm: "sha256",
          jti: "test-jti",
        },
      } as any);

      vi.mocked(getVerifyingKeyForJwt).mockResolvedValue(
        {} as any, // Mock CryptoKey
      );

      const mockFn = vi.fn().mockResolvedValue({ success: true });
      const wrappedFn = withPow(mockFn);

      const formData = new FormData();
      formData.append("powRequest", "mock-jwt");
      formData.append("powNonce", validNonce!.toString());

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as any;

      const result = await wrappedFn({ request: mockRequest } as any);

      // The function should succeed (not return pow error)
      expect(result).not.toEqual({
        error: "pow_invalid",
        requiredPowDifficulty: difficulty,
        input: {},
      });
    });

    it("rejects invalid PoW solutions", async () => {
      const mockGet = vi.mocked(KeyValueStore.get);
      const mockTransaction = vi.mocked(db.transaction);

      // Mock that we need PoW verification
      mockGet.mockImplementation(async (key) => {
        if (key === "192.168.1.100:pow") {
          return {
            failures: 5,
            difficulty: 17,
            last_failure: new Date(),
          };
        }
        if (key.startsWith("pow:")) {
          return null; // Challenge not used before
        }
        return null;
      });

      mockTransaction.mockImplementation(async (callback) => {
        return callback({} as any);
      });

      // Mock JWT verification with a challenge that won't match the invalid nonce
      const { jwtVerify } = await import("jose");
      const { getVerifyingKeyForJwt } = await import("./jwks");

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          challenge: "deadbeef".repeat(16),
          difficulty: 17,
          algorithm: "sha256",
          jti: "test-jti",
        },
      } as any);

      vi.mocked(getVerifyingKeyForJwt).mockResolvedValue(
        {} as any, // Mock CryptoKey
      );

      const mockFn = vi.fn();
      const wrappedFn = withPow(mockFn);

      const formData = new FormData();
      formData.append("powRequest", "mock-jwt");
      formData.append("powNonce", "99999999"); // Invalid nonce

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as any;

      const result = await wrappedFn({ request: mockRequest } as any);

      expect(result).toEqual({
        error: "pow_invalid",
        requiredPowDifficulty: 17,
        input: {},
      });
      expect(mockFn).not.toHaveBeenCalled();
    });
  });
});
