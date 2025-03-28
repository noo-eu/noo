import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authorizationNone } from "./promptNone";
import { AuthorizationRequest } from "@/types";
import { Client, Session } from "@/configuration";
import { setActiveSessions } from "../../vitest-setup";

const mockBuildSubClaim = vi.hoisted(() => vi.fn());
vi.mock("@/idToken", () => ({
  buildSubClaim: mockBuildSubClaim,
}));

const mockVerifyConsent = vi.hoisted(() => vi.fn());
vi.mock("@/consent", () => ({
  verifyConsent: mockVerifyConsent,
}));

const mockBuildAuthorizationResponse = vi.hoisted(() => vi.fn());
vi.mock("./response", () => ({
  buildAuthorizationResponse: mockBuildAuthorizationResponse,
}));

const mockReturnToClient = vi.hoisted(() => vi.fn());
vi.mock("./finish", () => ({
  returnToClient: mockReturnToClient,
}));

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
  ...overrides,
});

const createMockClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "test-client",
    redirectUris: ["https://client.example.com/cb"],
    ...overrides,
  }) as Client;

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  userId: `user-${Math.random()}`,
  lastAuthenticatedAt: new Date(),
  ...overrides,
});

describe("authorizationNone", () => {
  let testParams: AuthorizationRequest;
  let testClient: Client;

  beforeEach(() => {
    testParams = createMockAuthRequest();
    testClient = createMockClient();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns login_required if no active sessions", async () => {
    setActiveSessions([]); // No sessions found

    await authorizationNone(testParams, testClient);

    expect(mockVerifyConsent).not.toHaveBeenCalled();
    expect(mockBuildAuthorizationResponse).not.toHaveBeenCalled();
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(testParams, {
      error: "login_required",
    });
  });

  it("returns interaction_required if id_token_hint is provided but no matching session", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const hint = "hint-for-user2";
    testParams = createMockAuthRequest({ id_token_hint: hint });

    setActiveSessions([session1]);
    mockBuildSubClaim.mockReturnValue("hint-for-user1");

    await authorizationNone(testParams, testClient);

    expect(mockBuildSubClaim).toHaveBeenCalledWith(testClient, session1.userId);
    expect(mockVerifyConsent).not.toHaveBeenCalled();
    expect(mockBuildAuthorizationResponse).not.toHaveBeenCalled();
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(testParams, {
      error: "interaction_required",
    });
  });

  it("returns interaction_required if no id_token_hint and multiple consenting sessions found", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const session2 = createMockSession({ userId: "user2" });
    testParams = createMockAuthRequest({ scopes: ["openid"] }); // No id_token_hint

    setActiveSessions([session1, session2]);
    // Mock verifyConsent to return true for both sessions
    mockVerifyConsent.mockResolvedValue(true);

    await authorizationNone(testParams, testClient);

    expect(mockBuildSubClaim).not.toHaveBeenCalled();
    // verifyConsent should be called for each session
    expect(mockVerifyConsent).toHaveBeenCalledTimes(2);
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session2.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockBuildAuthorizationResponse).not.toHaveBeenCalled();
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(testParams, {
      error: "interaction_required",
    });
  });

  it("returns interaction_required if no id_token_hint and no consenting sessions found", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const session2 = createMockSession({ userId: "user2" });
    testParams = createMockAuthRequest({ scopes: ["openid"] }); // No id_token_hint

    setActiveSessions([session1, session2]);
    // Mock verifyConsent to return false for both sessions
    mockVerifyConsent.mockResolvedValue(false);

    await authorizationNone(testParams, testClient);

    expect(mockBuildSubClaim).not.toHaveBeenCalled();
    // verifyConsent should be called for each session
    expect(mockVerifyConsent).toHaveBeenCalledTimes(2);
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session2.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockBuildAuthorizationResponse).not.toHaveBeenCalled();
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(testParams, {
      error: "interaction_required",
    });
  });

  it("returns consent_required if a compatible session is found but consent is missing", async () => {
    const session1 = createMockSession({ userId: "user1" });
    testParams = createMockAuthRequest({ scopes: ["openid", "email"] }); // No id_token_hint

    setActiveSessions([session1]);
    // Mock verifyConsent: true for the first check (in findCompatibleSession), false for the second (in authorizationNone main body)
    // Note: This scenario highlights a potential inefficiency - verifyConsent might be called twice for the same user/scopes.
    // If findCompatibleSession only finds one, authorizationNone calls verifyConsent *again*.
    // For testing, we simulate this:
    mockVerifyConsent
      .mockResolvedValueOnce(true) // First call inside getConsentingSessions finds the session
      .mockResolvedValueOnce(false); // Second call inside authorizationNone finds consent missing

    await authorizationNone(testParams, testClient);

    expect(mockBuildSubClaim).not.toHaveBeenCalled();
    expect(mockVerifyConsent).toHaveBeenCalledTimes(2); // Called once in getConsentingSessions, once directly
    expect(mockVerifyConsent).toHaveBeenNthCalledWith(
      1,
      testClient,
      session1.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockVerifyConsent).toHaveBeenNthCalledWith(
      2,
      testClient,
      session1.userId,
      testParams.scopes,
      testParams.claims,
      true,
    ); // Called again
    expect(mockBuildAuthorizationResponse).not.toHaveBeenCalled();
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(testParams, {
      error: "consent_required",
    });
  });

  it("succeeds if id_token_hint matches a session and consent exists", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const hint = "hint-for-user1";
    const expectedResponseParams = {
      code: "mock_code",
      state: testParams.state,
    };
    testParams = createMockAuthRequest({ id_token_hint: hint });

    setActiveSessions([session1]);
    mockBuildSubClaim.mockReturnValue(hint); // Hint matches session1's user ID
    mockVerifyConsent.mockResolvedValue(true); // Consent granted
    mockBuildAuthorizationResponse.mockResolvedValue(expectedResponseParams);

    await authorizationNone(testParams, testClient);

    expect(mockBuildSubClaim).toHaveBeenCalledWith(testClient, session1.userId);
    expect(mockVerifyConsent).toHaveBeenCalledTimes(1); // Only called once directly
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockBuildAuthorizationResponse).toHaveBeenCalledTimes(1);
    expect(mockBuildAuthorizationResponse).toHaveBeenCalledWith(
      testParams,
      testClient,
      session1,
    );
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(
      testParams,
      expectedResponseParams,
    );
  });

  it("succeeds if no id_token_hint, one consenting session is found, and consent exists", async () => {
    const session1 = createMockSession({ userId: "user1" });
    const session2 = createMockSession({ userId: "user2" }); // Another non-consenting session
    const expectedResponseParams = {
      code: "mock_code_2",
      state: testParams.state,
    };
    testParams = createMockAuthRequest({ scopes: ["openid"] }); // No hint

    setActiveSessions([session1, session2]);
    // session1 consents, session2 does not (for the getConsentingSessions check)
    mockVerifyConsent.mockImplementation(
      async (client, userId, scopes, claims, promptNone) => {
        if (userId === session1.userId) return true; // Session 1 consents
        if (userId === session2.userId) return false; // Session 2 does not
        return false;
      },
    );

    mockBuildAuthorizationResponse.mockResolvedValue(expectedResponseParams);

    await authorizationNone(testParams, testClient);

    expect(mockBuildSubClaim).not.toHaveBeenCalled();

    // verifyConsent called 3 times:
    // 1. session1 in getConsentingSessions (returns true)
    // 2. session2 in getConsentingSessions (returns false)
    // 3. session1 again in authorizationNone main body (returns true again via mock impl)
    expect(mockVerifyConsent).toHaveBeenCalledTimes(3);
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session1.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );
    expect(mockVerifyConsent).toHaveBeenCalledWith(
      testClient,
      session2.userId,
      testParams.scopes,
      testParams.claims,
      true,
    );

    expect(mockBuildAuthorizationResponse).toHaveBeenCalledTimes(1);
    expect(mockBuildAuthorizationResponse).toHaveBeenCalledWith(
      testParams,
      testClient,
      session1,
    ); // Should use session1
    expect(mockReturnToClient).toHaveBeenCalledTimes(1);
    expect(mockReturnToClient).toHaveBeenCalledWith(
      testParams,
      expectedResponseParams,
    );
  });
});
