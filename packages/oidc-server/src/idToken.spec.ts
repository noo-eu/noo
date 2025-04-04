import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "./configuration";
import configuration from "./configuration";
import { createIdToken, decodeIdToken, idTokenHash } from "./idToken";

import { generateKeyPair } from "jose";

let testKeys: { publicKey: CryptoKey; privateKey: CryptoKey };
beforeAll(async () => {
  // Generate keys once for the entire suite for efficiency
  testKeys = await generateKeyPair("RS256");
});

// --- Base Client Setup ---
const createBaseClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "client-idtoken",
    issuer: "https://idp.test",
    idTokenSignedResponseAlg: "RS256", // Default to signed for most tests
    subjectType: "public",
    redirectUris: ["https://client.test/cb"],
    sectorIdentifierUri: undefined, // Explicitly undefined unless overridden
    // ... other necessary client fields
    ...overrides,
  }) as Client;

// --- Test Suite for createIdToken ---
describe("createIdToken", () => {
  let client: Client;
  let getSigningJwkSpy: ReturnType<typeof vi.spyOn>;
  let encodeSubValueSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = createBaseClient(); // Use RS256 by default

    // Mock configuration dependencies
    vi.spyOn(configuration, "getSigningJwk").mockResolvedValue({
      key: testKeys.privateKey,
      kid: "test-rs256-kid",
    });

    vi.spyOn(configuration, "getJwk").mockResolvedValue(testKeys.publicKey); // Mock public key retrieval

    vi.spyOn(configuration, "getClient").mockResolvedValue(client);
  });

  it("creates a valid JWT string for RS256 alg", async () => {
    const userId = "usr_rs256";
    const claims = { name: "Signy McSignface", email: "signy@example.com" };

    const idToken = await createIdToken(client, userId, claims);

    expect(idToken).toEqual(expect.any(String));
    expect(idToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
  });

  it("includes standard claims (iss, sub, aud, exp, iat)", async () => {
    const userId = "usr_standard";
    const claims = { nonce: "abc" };

    const idToken = await createIdToken(client, userId, claims);

    // Decode using the actual public key to verify content
    const payload = (
      await decodeIdToken(idToken, {
        alg: "RS256",
      })
    )._unsafeUnwrap();

    expect(payload.iss).toBe(client.issuer);
    expect(payload.sub).toBe(userId); // Because default client is public
    expect(payload.aud).toBe(client.clientId);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    expect(payload.nonce).toBe("abc");
  });

  it("includes custom claims provided", async () => {
    const userId = "usr_custom";
    const claims = { name: "Custom Claimer", custom_val: 123 };

    const idToken = await createIdToken(client, userId, claims);
    const payload = (
      await decodeIdToken(idToken, {
        alg: "RS256",
      })
    )._unsafeUnwrap();

    expect(payload.name).toBe("Custom Claimer");
    expect(payload.custom_val).toBe(123);
  });

  it("omits claims with undefined values", async () => {
    const userId = "usr_undef";
    const claims = { name: "Defined", email: undefined, custom: null }; // null should be included

    const idToken = await createIdToken(client, userId, claims);
    const payload = (
      await decodeIdToken(idToken, {
        alg: "RS256",
      })
    )._unsafeUnwrap();

    expect(payload.name).toBe("Defined");
    expect(payload).not.toHaveProperty("email");
    expect(payload.custom).toBeNull(); // null is included
  });

  describe("when alg is 'none'", () => {
    beforeEach(() => {
      client = createBaseClient({ idTokenSignedResponseAlg: "none" });
    });

    it("creates an unsigned ID Token string", async () => {
      const userId = "usr_none";
      const claims = { name: "Anon Ymous" };

      const idToken = await createIdToken(client, userId, claims);

      expect(idToken).toEqual(expect.any(String));
      // Unsigned JWT format: header.payload. (ends with a dot)
      expect(idToken).toMatch(/^[\w-]+\.[\w-]+\.$/);

      // Decode with alg: "none"
      const decoded = await decodeIdToken(idToken, { alg: "none" });
      expect(decoded.isOk()).toBe(true);
      expect(decoded._unsafeUnwrap()).toEqual(
        expect.objectContaining({
          iss: client.issuer,
          aud: client.clientId,
          sub: userId,
          name: "Anon Ymous",
          exp: expect.any(Number),
          iat: expect.any(Number),
        }),
      );
    });
  });

  describe("when subjectType is 'pairwise'", () => {
    const pairwiseUserId = "pairwise-user";
    let pairwiseClient: Client;

    beforeEach(() => {
      pairwiseClient = createBaseClient({
        subjectType: "pairwise",
        idTokenSignedResponseAlg: "RS256", // Test with signing
      });
      // Re-mock getClient needed by encodeSubValue mock
      vi.spyOn(configuration, "getClient").mockResolvedValue(pairwiseClient);
    });

    it("calls encodeSubValue to get the sub claim", async () => {
      const claims = { nonce: "pairwise_nonce" };

      const encodeSubValueSpy = vi.spyOn(configuration, "encodeSubValue");

      const idToken = await createIdToken(
        pairwiseClient,
        pairwiseUserId,
        claims,
      );

      // Decode and verify sub
      const payload = (
        await decodeIdToken(idToken, {
          alg: "RS256",
        })
      )._unsafeUnwrap();

      // when the subjectType is pairwise, sub should be encoded with encodeSubValue
      expect(encodeSubValueSpy).toHaveBeenCalled();

      expect(payload.sub).not.toBe(pairwiseUserId); // Should not be the raw userId
      expect(payload.nonce).toBe("pairwise_nonce");
    });

    it("uses sectorIdentifierUri in encodeSubValue if present", async () => {
      pairwiseClient = createBaseClient({
        subjectType: "pairwise",
        idTokenSignedResponseAlg: "RS256",
        sectorIdentifierUri: "https://sector.test",
      });
      vi.spyOn(configuration, "getClient").mockResolvedValue(pairwiseClient);

      const idToken1 = await createIdToken(pairwiseClient, pairwiseUserId, {});

      pairwiseClient = createBaseClient({
        subjectType: "pairwise",
        idTokenSignedResponseAlg: "RS256",
        // no sectorIdentifierUri
      });
      vi.spyOn(configuration, "getClient").mockResolvedValue(pairwiseClient);

      const idToken2 = await createIdToken(pairwiseClient, pairwiseUserId, {});

      // We expect the sub to be different for different sectorIdentifierUri
      const payload1 = (
        await decodeIdToken(idToken1, {
          alg: "RS256",
        })
      )._unsafeUnwrap().sub;
      const payload2 = (
        await decodeIdToken(idToken2, {
          alg: "RS256",
        })
      )._unsafeUnwrap().sub;
      expect(payload1).not.toBe(pairwiseUserId); // Should not be the raw userId
      expect(payload2).not.toBe(pairwiseUserId); // Should not be the raw userId
      expect(payload1).not.toBe(payload2); // Different sub values
    });
  });
});

describe("decodeIdToken", () => {
  let client: Client;
  let userId: string;
  let claims: Record<string, any>;
  let validIdToken: string;

  beforeAll(async () => {
    // Generate a single valid token using the test keys
    client = createBaseClient({ idTokenSignedResponseAlg: "RS256" }); // Ensure RS256
    userId = "usr_decode";
    claims = { name: "Decoder Dan", nonce: "decode_nonce" };
    vi.spyOn(configuration, "getClient").mockResolvedValue(client); // Mock client lookup if needed by encodeSubValue
    validIdToken = await createIdToken(client, userId, claims);
  });

  beforeEach(() => {
    client = createBaseClient({ idTokenSignedResponseAlg: "RS256" });
  });

  it("successfully decodes and verifies a valid RS256 token", async () => {
    const decoded = await decodeIdToken(validIdToken, {
      alg: "RS256",
    });

    expect(decoded.isOk()).toBe(true);
    expect(decoded._unsafeUnwrap()).toEqual(
      expect.objectContaining({
        iss: client.issuer,
        aud: client.clientId,
        sub: userId,
        name: claims.name,
        nonce: claims.nonce,
        exp: expect.any(Number),
        iat: expect.any(Number),
      }),
    );
  });

  it("returns Err('invalid_token') for a token signed with a different key", async () => {
    // Generate a token with a *different* key pair
    const otherKeys = await generateKeyPair("RS256");
    vi.spyOn(configuration, "getSigningJwk").mockResolvedValue({
      key: otherKeys.privateKey,
      kid: "other-kid",
    });
    const tokenSignedByOther = await createIdToken(client, "other_user", {
      test: 1,
    });
    vi.restoreAllMocks(); // Clean up creation mocks

    // Now try to decode using the *original* public key mock
    vi.spyOn(configuration, "getJwk").mockResolvedValue(testKeys.publicKey);

    const decoded = await decodeIdToken(tokenSignedByOther, { alg: "RS256" });

    expect(decoded.isErr()).toBe(true);
    expect(decoded._unsafeUnwrapErr()).toMatch(/invalid_token|signature/i);
  });

  it("returns Err('invalid_token') if alg does not match token header", async () => {
    // validIdToken was signed with RS256
    const decoded = await decodeIdToken(validIdToken, { alg: "ES256" }); // Try decoding with wrong alg

    // getJwk might be called depending on implementation, or it might fail earlier
    expect(decoded.isErr()).toBe(true);
    expect(decoded._unsafeUnwrapErr()).toMatch(/invalid_token|signature/i);
  });

  it("returns Err('invalid_token') for expired tokens", async () => {
    // Mock time to be in the future (e.g., token expiry is 1 hour, set time to 1h 1m later)
    const expiryTime = (
      await decodeIdToken(validIdToken, {
        alg: "RS256",
        allowExpired: true,
      })
    )._unsafeUnwrap().exp!;
    const futureTime = new Date((expiryTime + 60) * 1000); // 60 seconds after expiry
    vi.useFakeTimers();
    vi.setSystemTime(futureTime);

    const decoded = await decodeIdToken(validIdToken, { alg: "RS256" });

    vi.useRealTimers(); // IMPORTANT: Clean up fake timers

    expect(decoded.isErr()).toBe(true);
    expect(decoded._unsafeUnwrapErr()).toMatch(/expired|invalid_token/i);
  });

  it("returns Ok() for expired tokens if allowExpired is true", async () => {
    const expiryTime = (
      await decodeIdToken(validIdToken, {
        alg: "RS256",
        allowExpired: true,
      })
    )._unsafeUnwrap().exp!;
    const futureTime = new Date((expiryTime + 60) * 1000);
    vi.useFakeTimers();
    vi.setSystemTime(futureTime);

    // Pass allowExpired: true
    const decoded = await decodeIdToken(validIdToken, {
      alg: "RS256",
      allowExpired: true,
    });

    vi.useRealTimers();

    expect(decoded.isOk()).toBe(true); // Should succeed despite being expired
    expect(decoded._unsafeUnwrap()).toEqual(
      expect.objectContaining({ sub: userId }),
    );
  });

  it("validates issuer if provided", async () => {
    // Decode with correct issuer
    const decodedOk = await decodeIdToken(validIdToken, {
      alg: "RS256",
      issuer: client.issuer, // Correct issuer
    });
    expect(decodedOk.isOk()).toBe(true);

    // Decode with incorrect issuer
    const decodedErr = await decodeIdToken(validIdToken, {
      alg: "RS256",
      issuer: "https://wrong.issuer", // Incorrect issuer
    });
    expect(decodedErr.isErr()).toBe(true);
    expect(decodedErr._unsafeUnwrapErr()).toMatch(/invalid_token/i);
  });

  // Add tests for audience validation if implemented in decodeIdToken

  it("handles alg='none' correctly", async () => {
    // Create an unsigned token
    const unsignedClient = createBaseClient({
      idTokenSignedResponseAlg: "none",
    });
    vi.spyOn(configuration, "getClient").mockResolvedValue(unsignedClient); // Needed by encodeSubValue
    const unsignedToken = await createIdToken(
      unsignedClient,
      "user_none_decode",
      { test: "unsigned" },
    );

    // Decode with alg='none'
    const decoded = await decodeIdToken(unsignedToken, { alg: "none" });
    expect(decoded.isOk()).toBe(true);
    expect(decoded._unsafeUnwrap().test).toBe("unsigned");
  });
});

describe("idTokenHash", () => {
  describe("when the alg uses SHA-256", () => {
    it("hashes value with sha256, returning base64url encoded left half", () => {
      const value = "value_to_hash_256";
      // Precompute expected hash using node:crypto for comparison
      const nodeCrypto = require("node:crypto");
      const fullHash = nodeCrypto.createHash("sha256").update(value).digest();
      const leftHalf = fullHash.subarray(0, fullHash.length / 2);
      const expected = Buffer.from(leftHalf).toString("base64url");

      ["HS256", "RS256", "ES256", "PS256"].forEach((alg) => {
        expect(idTokenHash(alg, value)).toBe(expected);
      });
    });
  });

  describe("when the alg uses SHA-384", () => {
    it("hashes value with sha384, returning base64url encoded left half", () => {
      const value = "value_to_hash_384";
      const nodeCrypto = require("node:crypto");
      const fullHash = nodeCrypto.createHash("sha384").update(value).digest();
      const leftHalf = fullHash.subarray(0, fullHash.length / 2);
      const expected = Buffer.from(leftHalf).toString("base64url");

      ["HS384", "RS384", "ES384", "PS384"].forEach((alg) => {
        expect(idTokenHash(alg, value)).toBe(expected);
      });
    });
  });

  describe("when the alg uses SHA-512", () => {
    it("hashes value with sha512, returning base64url encoded left half", () => {
      const value = "value_to_hash_512";
      const nodeCrypto = require("node:crypto");
      const fullHash = nodeCrypto.createHash("sha512").update(value).digest();
      const leftHalf = fullHash.subarray(0, fullHash.length / 2);
      const expected = Buffer.from(leftHalf).toString("base64url");

      ["HS512", "RS512", "ES512", "PS512", "EdDSA"].forEach((alg) => {
        expect(idTokenHash(alg, value)).toBe(expected);
      });
    });
  });

  it("returns undefined if no value is provided", () => {
    expect(idTokenHash("RS256", undefined)).toBeUndefined();
    expect(idTokenHash("RS256")).toBeUndefined();
  });

  it("returns undefined if alg is 'none'", () => {
    expect(idTokenHash("none", "test_value")).toBeUndefined();
  });

  it("throws an error for an unsupported alg", () => {
    expect(() => idTokenHash("UnsupportedAlg", "test_value")).toThrow(
      /Unsupported algorithm/i,
    );
  });
});
