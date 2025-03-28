import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreateOidcAuthorizationCode = vi.hoisted(() => vi.fn());
const mockCreateOidcAccessToken = vi.hoisted(() => vi.fn());
const mockGetClaims = vi.hoisted(() => vi.fn());
const mockGetSessionStateValue = vi.hoisted(() => vi.fn());
vi.mock("@/configuration", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/configuration")>();
  return {
    ...original,
    default: {
      createOidcAuthorizationCode: mockCreateOidcAuthorizationCode,
      createOidcAccessToken: mockCreateOidcAccessToken,
      getClaims: mockGetClaims,
      getSessionStateValue: mockGetSessionStateValue,
      // Add other config properties if needed
    },
  };
});

const mockCreateIdToken = vi.hoisted(() => vi.fn());
const mockIdTokenHash = vi.hoisted(() => vi.fn());
vi.mock("@/idToken", () => ({
  createIdToken: mockCreateIdToken,
  idTokenHash: mockIdTokenHash,
}));

const mockRandomBytes = vi.hoisted(() => vi.fn());
vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal()),
  randomBytes: mockRandomBytes,
}));

// Import the function to test AFTER mocks are defined
import { buildAuthorizationResponse } from "./response"; // Adjust path if needed
import { AuthorizationRequest } from "@/types";
import { Client, Session } from "@/configuration";

// --- Test Setup ---

const createMockAuthRequest = (
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest =>
  ({
    response_type: "code", // Default response_type
    client_id: "test-client-123",
    redirect_uri: "https://client.app/callback",
    state: "state-opaque-value",
    prompt: "none",
    nonce: "nonce-random-value",
    scopes: ["openid", "profile", "email"],
    claims: { id_token: { email: null, name: null } }, // Example claims request
    max_age: undefined,
    id_token_hint: undefined,
    code_challenge: "mock_challenge",
    code_challenge_method: "S256",
    ...overrides,
  }) as AuthorizationRequest;

const createMockClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "test-client-123", // Ensure clientId matches request
    redirectUris: ["https://client.app/callback"],
    idTokenSignedResponseAlg: "RS256", // Example alg
    // Add other necessary client properties
    ...overrides,
  }) as Client;

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  userId: "user-def-456",
  lastAuthenticatedAt: new Date(Date.now() - 60000),
  ...overrides,
});

// --- Test Suite ---

describe("buildAuthorizationResponse", () => {
  let testParams: AuthorizationRequest;
  let testClient: Client;
  let testSession: Session;

  const mockCodeId = "mock_auth_code_xyz";
  const mockAccessTokenId = "mock_access_token_abc";
  const mockGeneratedIdToken = "mock.jwt.id_token";
  const mockHashedCode = "hashed_code_value";
  const mockHashedAccessToken = "hashed_at_value";
  const mockSessionStateVal = "session-cookie-value";
  const mockSalt = "mockSaltValue12345"; // 16 bytes -> 22 base64 chars usually
  const mockSaltBuffer = Buffer.from(mockSalt); // Needs to be buffer for crypto mock

  beforeEach(() => {
    testParams = createMockAuthRequest();
    testClient = createMockClient();
    testSession = createMockSession();

    // Setup default happy path mock implementations
    mockCreateOidcAuthorizationCode.mockResolvedValue({ id: mockCodeId });
    mockCreateOidcAccessToken.mockResolvedValue({ id: mockAccessTokenId });
    mockGetClaims.mockResolvedValue({
      sub: testSession.userId, // Ensure sub matches
      email: "test@example.com",
      name: "Test User",
    });
    mockCreateIdToken.mockResolvedValue(mockGeneratedIdToken);
    mockIdTokenHash.mockImplementation((alg, value) => {
      if (value === mockCodeId) return mockHashedCode;
      if (value === mockAccessTokenId) return mockHashedAccessToken;
      return undefined; // Default if unexpected value
    });
    mockGetSessionStateValue.mockResolvedValue(mockSessionStateVal);
    mockRandomBytes.mockReturnValue(mockSaltBuffer);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // --- Helper for session state assertion ---
  // Re-implementing sha256 logic here for assertion only
  // Avoids mocking sha256 itself but requires node:crypto for test execution
  const getExpectedSessionState = async (salt: string) => {
    const nodeCrypto = await import("node:crypto"); // Use actual crypto for assertion
    const origin = new URL(testParams.redirect_uri).origin;
    const stateInput = [
      testClient.clientId,
      origin,
      mockSessionStateVal,
      salt,
    ].join(" ");
    const hash = nodeCrypto
      .createHash("sha256")
      .update(stateInput)
      .digest("base64url");
    return `${hash}.${salt}`;
  };

  it("handles response_type=code", async () => {
    testParams.response_type = "code";

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    // Check code handler call
    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalledWith({
      clientId: testClient.clientId,
      userId: testSession.userId,
      redirectUri: testParams.redirect_uri,
      scopes: testParams.scopes,
      claims: testParams.claims,
      nonce: testParams.nonce,
      authTime: testSession.lastAuthenticatedAt,
      codeChallenge: testParams.code_challenge,
      codeChallengeMethod: testParams.code_challenge_method,
    });

    // Check other handlers NOT called
    expect(mockCreateOidcAccessToken).not.toHaveBeenCalled();
    expect(mockGetClaims).not.toHaveBeenCalled();
    expect(mockCreateIdToken).not.toHaveBeenCalled();

    // Check response object properties
    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).not.toHaveProperty("access_token");
    expect(response).not.toHaveProperty("token_type");
    expect(response).not.toHaveProperty("expires_in");
    expect(response).not.toHaveProperty("id_token");

    // Check session state
    expect(mockGetSessionStateValue).toHaveBeenCalledTimes(1);
    expect(mockRandomBytes).toHaveBeenCalledWith(16);
    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("handles response_type=token", async () => {
    testParams.response_type = "token";

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    // Check token handler call
    expect(mockCreateOidcAccessToken).toHaveBeenCalledTimes(1);
    expect(mockCreateOidcAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        // Use objectContaining for date check
        clientId: testClient.clientId,
        userId: testSession.userId,
        scopes: testParams.scopes,
        claims: testParams.claims,
        nonce: testParams.nonce,
        // expiresAt needs careful checking or expect.any(Date)
      }),
    );
    // Optional: Check expiresAt more closely if needed
    const accessTokenCallArgs = mockCreateOidcAccessToken.mock.calls[0][0];
    expect(accessTokenCallArgs.expiresAt).toBeInstanceOf(Date);
    expect(accessTokenCallArgs.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(accessTokenCallArgs.expiresAt.getTime()).toBeLessThan(
      Date.now() + 3601 * 1000,
    ); // Approx check

    // Check other handlers NOT called
    expect(mockCreateOidcAuthorizationCode).not.toHaveBeenCalled();
    expect(mockGetClaims).not.toHaveBeenCalled();
    expect(mockCreateIdToken).not.toHaveBeenCalled();

    // Check response object properties
    expect(response).not.toHaveProperty("code");
    expect(response).toHaveProperty("access_token", mockAccessTokenId);
    expect(response).toHaveProperty("token_type", "Bearer");
    expect(response).toHaveProperty("expires_in", "3600");
    expect(response).not.toHaveProperty("id_token");

    // Check session state
    expect(mockGetSessionStateValue).toHaveBeenCalledTimes(1);
    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("handles response_type=id_token", async () => {
    testParams.response_type = "id_token";
    testParams.claims = { id_token: { email: null, name: null } }; // Ensure claims requested

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    // Check ID token handler calls
    expect(mockIdTokenHash).toHaveBeenCalledTimes(2); // Called for code (undefined) and token (undefined)
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      undefined,
    ); // code is undefined
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      undefined,
    ); // access_token is undefined

    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockGetClaims).toHaveBeenCalledWith(testSession.userId, [
      "email",
      "name",
    ]); // Keys from params.claims.id_token

    expect(mockCreateIdToken).toHaveBeenCalledTimes(1);
    expect(mockCreateIdToken).toHaveBeenCalledWith(
      testClient,
      testSession.userId,
      {
        sub: testSession.userId,
        email: "test@example.com",
        name: "Test User",
        auth_time: Math.floor(testSession.lastAuthenticatedAt.getTime() / 1000),
        at_hash: undefined, // Because access_token wasn't generated
        c_hash: undefined, // Because code wasn't generated
        nonce: testParams.nonce,
      },
    );

    // Check other handlers NOT called
    expect(mockCreateOidcAuthorizationCode).not.toHaveBeenCalled();
    expect(mockCreateOidcAccessToken).not.toHaveBeenCalled();

    // Check response object properties
    expect(response).not.toHaveProperty("code");
    expect(response).not.toHaveProperty("access_token");
    expect(response).not.toHaveProperty("token_type");
    expect(response).not.toHaveProperty("expires_in");
    expect(response).toHaveProperty("id_token", mockGeneratedIdToken);

    // Check session state
    expect(mockGetSessionStateValue).toHaveBeenCalledTimes(1);
    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("handles response_type=code id_token token", async () => {
    testParams.response_type = "code id_token token";
    testParams.claims = { id_token: { name: null, email: null } };

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    // Check all handlers called
    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockCreateOidcAccessToken).toHaveBeenCalledTimes(1);

    // Check id_token handler calls specifically
    expect(mockIdTokenHash).toHaveBeenCalledTimes(2); // Called for code and token
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      mockCodeId,
    );
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      mockAccessTokenId,
    );

    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockGetClaims).toHaveBeenCalledWith(testSession.userId, [
      "name",
      "email",
    ]);

    expect(mockCreateIdToken).toHaveBeenCalledTimes(1);
    expect(mockCreateIdToken).toHaveBeenCalledWith(
      testClient,
      testSession.userId,
      {
        sub: testSession.userId,
        name: "Test User",
        email: "test@example.com",
        auth_time: Math.floor(testSession.lastAuthenticatedAt.getTime() / 1000),
        at_hash: mockHashedAccessToken, // Hash of mock access token
        c_hash: mockHashedCode, // Hash of mock code
        nonce: testParams.nonce,
      },
    );

    // Check response object properties
    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).toHaveProperty("access_token", mockAccessTokenId);
    expect(response).toHaveProperty("token_type", "Bearer");
    expect(response).toHaveProperty("expires_in", "3600");
    expect(response).toHaveProperty("id_token", mockGeneratedIdToken);

    // Check session state
    expect(mockGetSessionStateValue).toHaveBeenCalledTimes(1);
    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("handles response_type=code token", async () => {
    testParams.response_type = "code token";

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockCreateOidcAccessToken).toHaveBeenCalledTimes(1);
    expect(mockIdTokenHash).not.toHaveBeenCalled(); // id_token not requested
    expect(mockGetClaims).not.toHaveBeenCalled();
    expect(mockCreateIdToken).not.toHaveBeenCalled();

    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).toHaveProperty("access_token", mockAccessTokenId);
    expect(response).toHaveProperty("token_type", "Bearer");
    expect(response).toHaveProperty("expires_in", "3600");
    expect(response).not.toHaveProperty("id_token");

    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("handles response_type=code id_token", async () => {
    testParams.response_type = "code id_token";
    testParams.claims = { id_token: { name: null } };

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockCreateOidcAccessToken).not.toHaveBeenCalled();

    // Check id_token handler
    expect(mockIdTokenHash).toHaveBeenCalledTimes(2); // Called for code and token (undefined)
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      mockCodeId,
    );
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      undefined,
    ); // No access token

    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockGetClaims).toHaveBeenCalledWith(testSession.userId, ["name"]);

    expect(mockCreateIdToken).toHaveBeenCalledTimes(1);
    expect(mockCreateIdToken).toHaveBeenCalledWith(
      testClient,
      testSession.userId,
      expect.objectContaining({
        c_hash: mockHashedCode, // Hash of code
        at_hash: undefined, // No access token
        nonce: testParams.nonce,
      }),
    );

    // Check response
    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).not.toHaveProperty("access_token");
    expect(response).toHaveProperty("id_token", mockGeneratedIdToken);

    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("works even if no claims are requested", async () => {
    testParams.response_type = "code id_token";
    testParams.claims = {};

    const response = await buildAuthorizationResponse(
      testParams,
      testClient,
      testSession,
    );

    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockCreateOidcAccessToken).not.toHaveBeenCalled();

    // Check id_token handler
    expect(mockIdTokenHash).toHaveBeenCalledTimes(2); // Called for code and token (undefined)
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      mockCodeId,
    );
    expect(mockIdTokenHash).toHaveBeenCalledWith(
      testClient.idTokenSignedResponseAlg,
      undefined,
    ); // No access token

    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockGetClaims).toHaveBeenCalledWith(testSession.userId, []);

    expect(mockCreateIdToken).toHaveBeenCalledTimes(1);
    expect(mockCreateIdToken).toHaveBeenCalledWith(
      testClient,
      testSession.userId,
      expect.objectContaining({
        c_hash: mockHashedCode, // Hash of code
        at_hash: undefined, // No access token
        nonce: testParams.nonce,
      }),
    );

    // Check response
    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).not.toHaveProperty("access_token");
    expect(response).toHaveProperty("id_token", mockGeneratedIdToken);

    const expectedState = await getExpectedSessionState(mockSalt);
    expect(response).toHaveProperty("session_state", expectedState);
  });

  it("should throw error if getSessionStateValue returns null/undefined", async () => {
    mockGetSessionStateValue.mockResolvedValue(undefined); // Simulate missing session state cookie

    // Use expect(...).rejects.toThrow() for async functions
    await expect(
      buildAuthorizationResponse(testParams, testClient, testSession),
    ).rejects.toThrow("No session check cookie found");

    // Ensure other parts weren't called unnecessarily after the throw
    // Note: Depending on execution order, some might still be called before buildSessionState
    expect(mockCreateOidcAuthorizationCode).toHaveBeenCalled(); // Assuming code is processed first
    expect(mockRandomBytes).not.toHaveBeenCalled(); // Should not be called if getSessionStateValue fails
  });
});
