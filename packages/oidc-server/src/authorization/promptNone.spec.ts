import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationCode, Client, Session } from "../configuration";
import configuration from "../configuration";
import type { AuthorizationRequest } from "../types";
import { authorizationNone } from "./promptNone";

const createMockAuthRequest = (
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest => ({
  response_type: "code",
  response_mode: "query",
  client_id: "test-client",
  redirect_uri: "https://client.example.com/cb",
  scopes: ["openid", "profile"],
  state: "xyz",
  prompt: "none",
  nonce: "abc",
  claims: {},
  max_age: undefined,
  id_token_hint: undefined,
  login_hint: undefined,
  acr_values: undefined,
  ...overrides,
});

const createMockClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "test-client",
    redirectUris: ["https://client.example.com/cb"],
    clientName: "Test Client App",
    subjectType: "public",
    idTokenSignedResponseAlg: "RS256",
    ...overrides,
  }) as Client;

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  userId: Math.random().toString(36).substring(7),
  lastAuthenticatedAt: new Date(),
  ...overrides,
});

describe("authorizationNone", () => {
  let testParams: AuthorizationRequest;
  let testClient: Client;

  beforeEach(() => {
    testParams = createMockAuthRequest();
    testClient = createMockClient({ clientId: testParams.client_id });

    vi.spyOn(configuration, "getClient").mockResolvedValue(testClient);
    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([]);
    vi.spyOn(configuration, "getConsent").mockResolvedValue({
      scopes: [],
      claims: [],
    });
    vi.spyOn(configuration, "createAuthorizationCode").mockResolvedValue({
      id: "mock_auth_code_id",
    } as AuthorizationCode);
    vi.spyOn(configuration, "getClaims").mockResolvedValue({});
  });

  it("returns login_required error if no active sessions are found", async () => {
    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: `${testParams.redirect_uri}?error=login_required&state=${testParams.state}`,
    });
    expect(configuration.getConsent).not.toHaveBeenCalled();
    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
  });

  it("returns login_required error if id_token_hint is provided but no matching session user ID", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const hint = "hint-for-user2"; // Does not match user1
    testParams = createMockAuthRequest({ id_token_hint: hint });

    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([session1]);

    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: `${testParams.redirect_uri}?error=login_required&state=${testParams.state}`,
    });
    expect(configuration.getConsent).not.toHaveBeenCalled();
    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
  });

  it("calls getActiveSessions with max_age and returns login_required if no sessions are returned", async () => {
    const maxAgeSeconds = 3600;
    testParams = createMockAuthRequest({ max_age: maxAgeSeconds });

    // Ensure the max_age is passed correctly and no sessions are returned
    const getActiveSessionsMock = vi
      .spyOn(configuration, "getActiveSessions")
      .mockImplementation(async () => []);

    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(getActiveSessionsMock).toHaveBeenCalledTimes(1);
    expect(getActiveSessionsMock).toHaveBeenCalledWith(
      expect.any(Object),
      maxAgeSeconds,
    );

    expect(configuration.getConsent).not.toHaveBeenCalled();
    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();

    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: `${testParams.redirect_uri}?error=login_required&state=${testParams.state}`,
    });
  });

  it("returns interaction_required error if no id_token_hint and multiple sessions found (even if consenting)", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const session2 = createMockSession({ userId: "user2" });
    testParams = createMockAuthRequest();

    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
      session1,
      session2,
    ]);

    // Mock getConsent to show both would be valid candidates
    vi.spyOn(configuration, "getConsent").mockResolvedValue({
      scopes: testParams.scopes,
      claims: [],
    });

    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);

    expect(configuration.getConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
    );
    expect(configuration.getConsent).toHaveBeenCalledWith(
      testClient,
      session2.userId,
    );

    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: `${testParams.redirect_uri}?error=interaction_required&state=${testParams.state}`,
    });

    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
  });

  it("returns interaction_required error if no id_token_hint and no sessions have sufficient consent", async () => {
    const session1 = createMockSession({ userId: "user1" });
    testParams = createMockAuthRequest({ scopes: ["openid", "email"] }); // Requesting 'email' scope

    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([session1]);
    // Mock getConsent: User has only consented to 'openid', not 'email'
    vi.spyOn(configuration, "getConsent").mockResolvedValue({
      scopes: ["openid"],
      claims: [],
    });

    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(configuration.getConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
    );
    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: `${testParams.redirect_uri}?error=consent_required&state=${testParams.state}`,
    });
    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
  });

  it("succeeds if id_token_hint matches a valid session and consent exists", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const hint = session1.userId; // Public subject identifier, matches session1
    testParams = createMockAuthRequest({ id_token_hint: hint });
    const expectedAuthCode = "generated_code_123";

    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([session1]);
    vi.spyOn(configuration, "getConsent").mockResolvedValue({
      scopes: testParams.scopes,
      claims: [],
    });
    vi.spyOn(configuration, "createAuthorizationCode").mockResolvedValue({
      id: expectedAuthCode,
    } as AuthorizationCode);

    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
    expect(configuration.getConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
    );
    expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(configuration.createAuthorizationCode).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        clientId: testClient.clientId,
        userId: session1.userId,
        redirectUri: testParams.redirect_uri,
        scopes: testParams.scopes,
        nonce: testParams.nonce,
        authTime: session1.lastAuthenticatedAt,
      }),
    );

    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: expect.stringContaining(`${testParams.redirect_uri}?`),
    });

    // Check the URL contains the expected code and state
    expect(result.url).toContain(`code=${expectedAuthCode}`);
    expect(result.url).toContain(`state=${testParams.state}`);
    expect(result.url).toContain(`session_state=`);
  });

  it("succeeds if no id_token_hint, exactly one valid & consenting session is found", async () => {
    const session1 = createMockSession({ userId: "user1" }); // The good session
    const session2 = createMockSession({ userId: "user2" }); // Another session, e.g., without consent
    testParams = createMockAuthRequest({ scopes: ["openid", "profile"] });
    const expectedAuthCode = "generated_code_456";

    vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
      session1,
      session2,
    ]);

    // session1 has consent, session2 does not
    vi.spyOn(configuration, "getConsent").mockImplementation(
      async (_, userId) => {
        if (userId === session1.userId) {
          return { scopes: testParams.scopes, claims: [] };
        }
        return { scopes: [], claims: [] };
      },
    );

    vi.spyOn(configuration, "createAuthorizationCode").mockResolvedValue({
      id: expectedAuthCode,
    } as AuthorizationCode);

    const result = await authorizationNone(
      new Request("http://localhost/"),
      testParams,
      testClient,
    );

    expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);

    expect(configuration.getConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
    );
    expect(configuration.getConsent).toHaveBeenCalledWith(
      testClient,
      session2.userId,
    );

    // Code should be created for the consenting session (session1)
    expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(configuration.createAuthorizationCode).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        clientId: testClient.clientId,
        userId: session1.userId, // <-- Correct user
        scopes: testParams.scopes,
      }),
    );

    expect(result).toEqual({
      params: testParams,
      nextStep: "REDIRECT",
      url: expect.stringContaining(`${testParams.redirect_uri}?`),
    });

    // Check the URL contains the expected code and state
    expect(result.url).toContain(`code=${expectedAuthCode}`);
    expect(result.url).toContain(`state=${testParams.state}`);
    expect(result.url).toContain(`session_state=`);
  });

  describe("when configuration functions fail", () => {
    it("returns login_required error if getActiveSessions throws an error", async () => {
      const error = new Error("Database unavailable");
      vi.spyOn(configuration, "getActiveSessions").mockRejectedValueOnce(error);

      const result = await authorizationNone(
        new Request("http://localhost/"),
        testParams,
        testClient,
      );

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).not.toHaveBeenCalled();
      expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
      expect(result).toEqual({
        params: testParams,
        nextStep: "REDIRECT",
        url: `${testParams.redirect_uri}?error=login_required&state=${testParams.state}`,
      });
    });

    it("returns consent_required error if getConsent throws an error", async () => {
      const session1 = createMockSession({ userId: "user1" });
      const error = new Error("Consent check failed");
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
      ]);
      vi.spyOn(configuration, "getConsent").mockRejectedValueOnce(error);

      const result = await authorizationNone(
        new Request("http://localhost/"),
        testParams,
        testClient,
      );

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).toHaveBeenCalledWith(
        testClient,
        session1.userId,
      );
      expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
      expect(result).toEqual({
        params: testParams,
        nextStep: "REDIRECT",
        url: `${testParams.redirect_uri}?error=consent_required&state=${testParams.state}`,
      });
    });

    it("returns server_error if createAuthorizationCode throws an error", async () => {
      const session1 = createMockSession({ userId: "user1" });
      const error = new Error("Failed to save auth code");
      vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
        session1,
      ]);
      vi.spyOn(configuration, "getConsent").mockResolvedValue({
        scopes: testParams.scopes,
        claims: [],
      });
      vi.spyOn(configuration, "createAuthorizationCode").mockRejectedValueOnce(
        error,
      );

      const result = await authorizationNone(
        new Request("http://localhost/"),
        testParams,
        testClient,
      );

      expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      expect(configuration.getConsent).toHaveBeenCalledWith(
        testClient,
        session1.userId,
      );
      expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        params: testParams,
        nextStep: "REDIRECT",
        url: expect.stringContaining(
          `${testParams.redirect_uri}?error=server_error&`,
        ),
      });
    });
  });
});
