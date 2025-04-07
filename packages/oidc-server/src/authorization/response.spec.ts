import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationCode, Client, Session } from "../configuration";
import configuration from "../configuration";
import type { AuthorizationRequest } from "../types";
import { buildAuthorizationResponse } from "./response";

const createMockAuthRequest = (
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest => ({
  response_type: "code",
  response_mode: "query",
  client_id: "test-client-123",
  redirect_uri: "https://client.app/callback",
  state: "state-opaque-value",
  prompt: "none",
  nonce: "nonce-random-value",
  scopes: ["openid", "profile", "email"],
  claims: { id_token: { email: null, name: null } },
  max_age: undefined,
  id_token_hint: undefined,
  code_challenge: "mock_challenge",
  code_challenge_method: "S256",
  ...overrides,
});

const createMockClient = (overrides: Partial<Client> = {}): Client => ({
  clientId: "test-client-123",
  clientSecret: "secret",
  issuer: "https://idp.example.com",
  redirectUris: ["https://client.app/callback"],
  idTokenSignedResponseAlg: "RS256",
  userinfoSignedResponseAlg: "RS256",
  tokenEndpointAuthMethod: "client_secret_basic",
  subjectType: "public",
  responseTypes: ["code", "id_token", "token"],
  grantTypes: ["authorization_code", "refresh_token"],
  ...overrides,
});

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  userId: "user-def-456",
  lastAuthenticatedAt: new Date(Date.now() - 60000), // 1 minute ago
  ...overrides,
});

// Mock signing key (replace with actual key generation/loading if needed, but mock is simpler)
const mockSigningKey: CryptoKey = { type: "private" } as CryptoKey; // Dummy key object

// --- Test Suite ---

describe("buildAuthorizationResponse", () => {
  let testParams: AuthorizationRequest;
  let testClient: Client;
  let testSession: Session;

  // Define expected return IDs for mocks
  const mockCodeId = "mock_auth_code_xyz";
  const mockAccessTokenId = "mock_access_token_abc";
  // No mock ID token value needed, we'll check for existence/format
  const mockSessionStateVal = "session-cookie-value"; // Value from IdP's session mechanism

  beforeEach(() => {
    testParams = createMockAuthRequest();
    testClient = createMockClient();
    testSession = createMockSession();

    // --- Use vi.spyOn for configuration methods ---
    vi.spyOn(configuration, "createAuthorizationCode").mockResolvedValue({
      id: mockCodeId,
    } as unknown as AuthorizationCode);
    vi.spyOn(configuration, "createAccessToken").mockResolvedValue({
      id: mockAccessTokenId,
    });
    vi.spyOn(configuration, "getClaims").mockResolvedValue({
      // Default claims returned by the IdP config function
      sub: testSession.userId, // Essential
      email: "test@example.com",
      name: "Test User",
      email_verified: true,
      // Add other claims potentially derived from scopes/session
    });
    vi.spyOn(configuration, "getSessionStateValue").mockResolvedValue(
      mockSessionStateVal,
    );
    // Spy on getClient as it might be used internally
    vi.spyOn(configuration, "getClient").mockResolvedValue(testClient);
  });

  // No local afterEach needed, rely on global restoreAllMocks

  // --- Helper for session state assertion (Adapted) ---
  const verifySessionState = (
    actualSessionState: string | undefined | null,
    expectedCookieValue: string,
    clientId: string,
    redirectUri: string,
  ) => {
    expect(actualSessionState).toBeDefined();
    expect(actualSessionState).not.toBeNull();
    // Session state format: hash.salt
    const parts = actualSessionState!.split(".");
    expect(parts).toHaveLength(2);
    const hashPart = parts[0];
    const saltPart = parts[1];
    expect(saltPart).toBeDefined();
    expect(saltPart).not.toBe(""); // Salt should exist

    // Calculate the expected hash using the *actual* salt from the response
    const origin = new URL(redirectUri).origin;
    const stateInput = [clientId, origin, expectedCookieValue, saltPart].join(
      " ",
    );
    const expectedHash = createHash("sha256")
      .update(stateInput)
      .digest("base64url");

    expect(hashPart).toBe(expectedHash);
  };

  it("handles response_type=code", async () => {
    testParams.response_type = "code";

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );

    // Check configuration calls
    expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(configuration.createAuthorizationCode).toHaveBeenCalledWith(
      expect.any(Object),
      {
        clientId: testClient.clientId,
        userId: testSession.userId,
        redirectUri: testParams.redirect_uri,
        scopes: testParams.scopes,
        claims: testParams.claims, // Pass claims config through
        nonce: testParams.nonce,
        authTime: testSession.lastAuthenticatedAt,
        codeChallenge: testParams.code_challenge,
        codeChallengeMethod: testParams.code_challenge_method,
        // Potentially sid if relevant from session
      },
    );

    expect(configuration.createAccessToken).not.toHaveBeenCalled();
    expect(configuration.getClaims).not.toHaveBeenCalled(); // Not needed for code-only response data
    expect(configuration.getSigningJwk).not.toHaveBeenCalled(); // No ID token generated

    // Check response object properties
    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).not.toHaveProperty("access_token");
    expect(response).not.toHaveProperty("id_token");

    // Check session state
    expect(configuration.getSessionStateValue).toHaveBeenCalledTimes(1);
    verifySessionState(
      response.session_state,
      mockSessionStateVal,
      testClient.clientId,
      testParams.redirect_uri,
    );
  });

  it("handles response_type=token", async () => {
    testParams.response_type = "token";
    const expiresIn = 3600; // Standard expiry

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );

    // Check configuration calls
    expect(configuration.createAccessToken).toHaveBeenCalledTimes(1);
    expect(configuration.createAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: testClient.clientId,
        userId: testSession.userId,
        scopes: testParams.scopes,
        claims: testParams.claims, // Pass claims config through
        nonce: testParams.nonce, // Include nonce if needed by token creation logic
        // expiresAt is calculated internally, check separately if needed
      }),
    );
    // Optional: Check expiresAt calculation if buildAuthorizationResponse sets it
    // This depends on whether createAccessToken expects a duration/timestamp or calculates it.
    // Assuming buildAuthorizationResponse calculates based on expiresIn:
    // const accessTokenCallArgs = vi.mocked(configuration.createAccessToken).mock.calls[0][0];
    // expect(accessTokenCallArgs.expiresAt.getTime()).toBeCloseTo(Date.now() + expiresIn * 1000, -3); // Check within ~1 sec

    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
    expect(configuration.getClaims).not.toHaveBeenCalled();
    expect(configuration.getSigningJwk).not.toHaveBeenCalled();

    // Check response object properties
    expect(response).not.toHaveProperty("code");
    expect(response).toHaveProperty("access_token", mockAccessTokenId);
    expect(response).toHaveProperty("token_type", "Bearer");
    expect(response).toHaveProperty("expires_in", String(expiresIn)); // Should be string
    expect(response).not.toHaveProperty("id_token");

    // Check session state
    expect(configuration.getSessionStateValue).toHaveBeenCalledTimes(1);
    verifySessionState(
      response.session_state,
      mockSessionStateVal,
      testClient.clientId,
      testParams.redirect_uri,
    );
  });

  it("handles response_type=id_token", async () => {
    testParams.response_type = "id_token";
    const requestedIdTokenClaims = ["email", "name"]; // from testParams.claims.id_token
    testParams.claims = { id_token: { email: null, name: null } };

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );

    // Check ID token dependency calls
    expect(configuration.getClaims).toHaveBeenCalledTimes(1);
    expect(configuration.getClaims).toHaveBeenCalledWith(
      testSession.userId,
      requestedIdTokenClaims,
    );
    expect(configuration.getSigningJwk).toHaveBeenCalledTimes(1);
    expect(configuration.getSigningJwk).toHaveBeenCalledWith({
      alg: testClient.idTokenSignedResponseAlg,
    });

    // Check other handlers NOT called
    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
    expect(configuration.createAccessToken).not.toHaveBeenCalled();

    // Check response object properties
    expect(response).not.toHaveProperty("code");
    expect(response).not.toHaveProperty("access_token");
    expect(response).toHaveProperty("id_token");
    expect(response.id_token).toEqual(expect.any(String)); // Check it's a string
    expect(response.id_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // Basic JWT format check

    // Check session state
    expect(configuration.getSessionStateValue).toHaveBeenCalledTimes(1);
    verifySessionState(
      response.session_state,
      mockSessionStateVal,
      testClient.clientId,
      testParams.redirect_uri,
    );
  });

  it("handles response_type=code id_token token", async () => {
    testParams.response_type = "code id_token token";
    const requestedIdTokenClaims = ["email", "name"]; // from testParams.claims.id_token
    testParams.claims = { id_token: { email: null, name: null } };
    const expiresIn = 3600;

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );

    // Check all relevant config calls
    expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(configuration.createAccessToken).toHaveBeenCalledTimes(1);
    expect(configuration.getClaims).toHaveBeenCalledTimes(1);
    expect(configuration.getClaims).toHaveBeenCalledWith(
      testSession.userId,
      requestedIdTokenClaims,
    );
    expect(configuration.getSigningJwk).toHaveBeenCalledTimes(1);
    expect(configuration.getSigningJwk).toHaveBeenCalledWith({
      alg: testClient.idTokenSignedResponseAlg,
    });

    // Check response object properties
    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).toHaveProperty("access_token", mockAccessTokenId);
    expect(response).toHaveProperty("token_type", "Bearer");
    expect(response).toHaveProperty("expires_in", String(expiresIn));
    expect(response).toHaveProperty("id_token");
    expect(response.id_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    // Check session state
    expect(configuration.getSessionStateValue).toHaveBeenCalledTimes(1);
    verifySessionState(
      response.session_state,
      mockSessionStateVal,
      testClient.clientId,
      testParams.redirect_uri,
    );
  });

  // Add tests for other combinations (code token, code id_token) similarly...

  it("handles response_type=code id_token", async () => {
    testParams.response_type = "code id_token";
    const requestedIdTokenClaims = ["email", "name"];
    testParams.claims = { id_token: { email: null, name: null } };

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );

    expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(configuration.createAccessToken).not.toHaveBeenCalled();
    expect(configuration.getClaims).toHaveBeenCalledTimes(1);
    expect(configuration.getClaims).toHaveBeenCalledWith(
      testSession.userId,
      requestedIdTokenClaims,
    );
    expect(configuration.getSigningJwk).toHaveBeenCalledTimes(1);

    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).not.toHaveProperty("access_token");
    expect(response).toHaveProperty("id_token");
    expect(response.id_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    expect(configuration.getSessionStateValue).toHaveBeenCalledTimes(1);
    verifySessionState(
      response.session_state,
      mockSessionStateVal,
      testClient.clientId,
      testParams.redirect_uri,
    );
  });

  it("creates id_token even if no specific claims are requested via claims parameter", async () => {
    // Still needs 'openid' scope
    testParams.response_type = "code id_token";
    testParams.claims = {}; // No specific claims requested via parameter
    testParams.scopes = ["openid"]; // Only openid scope

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );

    expect(configuration.createAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(configuration.createAccessToken).not.toHaveBeenCalled();

    // getClaims might be called with an empty array or default claims based on openid scope
    expect(configuration.getClaims).toHaveBeenCalledTimes(1);
    // The exact claims requested depends on internal logic mapping scopes/claims parameter
    // Let's assume it calls getClaims with an empty array if claims param is empty. Adjust if needed.
    expect(configuration.getClaims).toHaveBeenCalledWith(
      testSession.userId,
      [],
    );
    expect(configuration.getSigningJwk).toHaveBeenCalledTimes(1);

    expect(response).toHaveProperty("code", mockCodeId);
    expect(response).not.toHaveProperty("access_token");
    expect(response).toHaveProperty("id_token");
    expect(response.id_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    verifySessionState(
      response.session_state,
      mockSessionStateVal,
      testClient.clientId,
      testParams.redirect_uri,
    );
  });

  it("returns error=server_error if getSessionStateValue raises an error", async () => {
    const error = new Error("Session state value retrieval failed");
    vi.spyOn(configuration, "getSessionStateValue").mockRejectedValue(error);

    const response = await buildAuthorizationResponse(
      new Request("http://localhost/"),
      testParams,
      testClient,
      testSession,
    );
    expect(response).toEqual({
      error: "server_error",
      error_description: "An error occurred while processing the request.",
    });
  });

  it("throws error if getSigningJwk fails when id_token is requested", async () => {
    testParams.response_type = "id_token";
    const error = new Error("Key retrieval failed");
    vi.spyOn(configuration, "getSigningJwk").mockRejectedValue(error);

    await expect(
      buildAuthorizationResponse(
        new Request("http://localhost/"),
        testParams,
        testClient,
        testSession,
      ),
    ).rejects.toThrow("Key retrieval failed");

    // Check that earlier steps might have run, but token creation didn't complete
    expect(configuration.getClaims).toHaveBeenCalled(); // Should be called before signing
    expect(configuration.createAuthorizationCode).not.toHaveBeenCalled();
    expect(configuration.createAccessToken).not.toHaveBeenCalled();
  });
});
