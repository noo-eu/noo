import { beforeEach, describe, expect, it, vi } from "vitest";
// Import the function to test
import type { Client, Session } from "../configuration";
import configuration from "../configuration";
import type { AuthorizationRequest, Claims } from "../types";
import { authorizationAny } from "./promptAny";

const createMockAuthRequest = (
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest => ({
  response_type: "code",
  response_mode: "query",
  client_id: "client-any",
  redirect_uri: "https://client.app/any/callback",
  state: "state-any",
  prompt: undefined,
  nonce: "nonce-any",
  scopes: ["openid", "profile"],
  claims: {},
  max_age: undefined,
  id_token_hint: undefined,
  ...overrides,
});

const createMockClient = (overrides: Partial<Client> = {}): Client => ({
  issuer: "https://idp.example.com",
  clientId: "client-any",
  clientSecret: "secret",
  redirectUris: ["https://client.app/any/callback"],
  idTokenSignedResponseAlg: "RS256",
  userinfoSignedResponseAlg: "RS256",
  tokenEndpointAuthMethod: "client_secret_basic",
  subjectType: "public",
  ...overrides,
});

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  userId: `user-any-${Math.random().toString(36).substring(7)}`,
  lastAuthenticatedAt: new Date(Date.now() - 120000), // 2 minutes ago
  ...overrides,
});

describe("authorizationAny", () => {
  let testParams: AuthorizationRequest;
  let testClient: Client;

  beforeEach(() => {
    testParams = createMockAuthRequest();
    testClient = createMockClient({ clientId: testParams.client_id });

    // Spy on getClient as it might be used by buildSubClaim/verifyConsent
    vi.spyOn(configuration, "getClient").mockResolvedValue(testClient);
  });

  // Rely on global afterEach for restoreAllMocks

  it('returns nextStep: "SIGN_IN" when no active sessions are found', async () => {
    const result = await authorizationAny(testParams, testClient);

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(configuration.getActiveSessions).toHaveBeenCalledWith(undefined); // Called without max_age
    expect(configuration.getConsent).not.toHaveBeenCalled();
    expect(result).toEqual({ params: testParams, nextStep: "SIGN_IN" });
  });

  it("calls getActiveSessions with max_age from params", async () => {
    const maxAgeSeconds = 7200;
    testParams = createMockAuthRequest({ max_age: maxAgeSeconds });
    // Default mock returns []

    await authorizationAny(testParams, testClient);

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(configuration.getActiveSessions).toHaveBeenCalledWith(maxAgeSeconds); // Called WITH max_age
    // Result should still be SIGN_IN as no sessions are returned
  });

  it('returns nextStep: "SELECT_ACCOUNT" when multiple active sessions are found (no hint)', async () => {
    const session1 = createMockSession();
    const session2 = createMockSession();
    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
      session1,
      session2,
    ]);

    const result = await authorizationAny(testParams, testClient);

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(configuration.getConsent).not.toHaveBeenCalled(); // Shouldn't check consent if multiple sessions
    expect(result).toEqual({ params: testParams, nextStep: "SELECT_ACCOUNT" });
  });

  describe("when exactly one active session is found", () => {
    let session1: Session;

    beforeEach(() => {
      session1 = createMockSession();
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
      ]);
    });

    it('returns nextStep: "CONFIRM" if consent exists', async () => {
      const getConsentMock = vi
        .spyOn(configuration, "getConsent")
        .mockResolvedValue({ scopes: testParams.scopes!, claims: [] }); // Assuming no specific claims requested

      const result = await authorizationAny(testParams, testClient);

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      // Check that getConsent was called (via internal verifyConsent)
      expect(getConsentMock).toHaveBeenCalledTimes(1);
      expect(getConsentMock).toHaveBeenCalledWith(testClient, session1.userId);
      // Verify result
      expect(result).toEqual({
        params: testParams,
        nextStep: "CONFIRM",
        userId: session1.userId, // Include userId
      });
    });

    it('returns nextStep: "CONFIRM" if consent exists for scopes and requested claims', async () => {
      const requestedClaims: Claims = { userinfo: { email: null } };
      testParams = createMockAuthRequest({
        scopes: ["openid", "email"],
        claims: requestedClaims,
      });
      const getConsentMock = vi
        .spyOn(configuration, "getConsent")
        .mockResolvedValue({ scopes: ["openid", "email"], claims: ["email"] }); // Consent includes scope and claim

      const result = await authorizationAny(testParams, testClient);

      expect(getConsentMock).toHaveBeenCalledTimes(1);
      // verifyConsent (internal) should compare requested scopes/claims with actual consent
      expect(getConsentMock).toHaveBeenCalledWith(testClient, session1.userId);
      expect(result).toEqual({
        params: testParams,
        nextStep: "CONFIRM",
        userId: session1.userId,
      });
    });

    it('returns nextStep: "CONSENT" if consent is missing for scopes', async () => {
      const getConsentMock = vi
        .spyOn(configuration, "getConsent")
        .mockResolvedValue({ scopes: [], claims: [] });

      const result = await authorizationAny(testParams, testClient);

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(getConsentMock).toHaveBeenCalledTimes(1);
      expect(getConsentMock).toHaveBeenCalledWith(testClient, session1.userId);
      expect(result).toEqual({
        params: testParams,
        nextStep: "CONSENT",
        userId: session1.userId, // Include userId
      });
    });

    it('returns nextStep: "CONSENT" if consent is missing for requested claims', async () => {
      const requestedClaims: Claims = {
        userinfo: { email: { essential: true } },
      };
      testParams = createMockAuthRequest({
        scopes: ["openid", "email"],
        claims: requestedClaims,
      });
      const getConsentMock = vi
        .spyOn(configuration, "getConsent")
        .mockResolvedValue({ scopes: ["openid", "email"], claims: [] }); // Has scope consent, lacks claim consent

      const result = await authorizationAny(testParams, testClient);

      expect(getConsentMock).toHaveBeenCalledTimes(1);
      expect(getConsentMock).toHaveBeenCalledWith(testClient, session1.userId);
      expect(result).toEqual({
        params: testParams,
        nextStep: "CONSENT",
        userId: session1.userId,
      });
    });
  });

  describe("with id_token_hint", () => {
    let session1: Session;
    let session2: Session;
    let hintForUser1: string;

    beforeEach(() => {
      session1 = createMockSession({ userId: "user1-hint" });
      session2 = createMockSession({ userId: "user2-hint" });
      testParams = createMockAuthRequest({ id_token_hint: session1.userId });
    });

    it("filters sessions and proceeds if hint matches exactly one session (consent exists)", async () => {
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
        session2,
      ]);
      vi.spyOn(configuration, "getConsent") // Consent exists for user1
        .mockResolvedValue({ scopes: testParams.scopes!, claims: [] });

      const result = await authorizationAny(testParams, testClient);

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      // Consent check should only happen for the matched session (session1)
      expect(configuration.getConsent).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).toHaveBeenCalledWith(
        testClient,
        session1.userId,
      );
      // Should go to CONFIRM because hint matched session1 and consent exists
      expect(result).toEqual({
        params: testParams,
        nextStep: "CONFIRM",
        userId: session1.userId,
      });
    });

    it("filters sessions and proceeds if hint matches exactly one session (consent missing)", async () => {
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
        session2,
      ]);
      vi.spyOn(configuration, "getConsent") // Consent missing for user1
        .mockResolvedValue({ scopes: [], claims: [] });

      const result = await authorizationAny(testParams, testClient);

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).toHaveBeenCalledWith(
        testClient,
        session1.userId,
      );
      // Should go to CONSENT because hint matched session1 but consent missing
      expect(result).toEqual({
        params: testParams,
        nextStep: "CONSENT",
        userId: session1.userId,
      });
    });

    it('returns nextStep: "SIGN_IN" if hint matches no sessions', async () => {
      testParams = createMockAuthRequest({
        id_token_hint: "non-matching-hint",
      });
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
        session2,
      ]);

      const result = await authorizationAny(testParams, testClient);

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).not.toHaveBeenCalled();
      expect(result).toEqual({ params: testParams, nextStep: "SIGN_IN" });
    });

    it('returns nextStep: "SIGN_IN" if hint is provided but no sessions exist initially', async () => {
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([]);

      const result = await authorizationAny(testParams, testClient);

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).not.toHaveBeenCalled();
      expect(result).toEqual({ params: testParams, nextStep: "SIGN_IN" });
    });
  });

  describe("when configuration functions fail", () => {
    it("gracefully handles errors from getActiveSessions", async () => {
      vi.spyOn(configuration, "getActiveSessions").mockRejectedValue(
        new Error("Database error"),
      );

      await expect(authorizationAny(testParams, testClient)).resolves.toEqual({
        params: testParams,
        nextStep: "SIGN_IN",
      });
    });

    it("gracefully handles errors from getConsent", async () => {
      const session1 = createMockSession();
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
      ]);
      vi.spyOn(configuration, "getConsent").mockRejectedValue(
        new Error("Database error"),
      );

      await expect(authorizationAny(testParams, testClient)).resolves.toEqual({
        params: testParams,
        nextStep: "CONSENT",
        userId: session1.userId,
      });
    });
  });
});
