import { Buffer } from "node:buffer"; // For btoa/atob
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the function to test
import type { AuthorizationCode, Client } from "../configuration";
import configuration from "../configuration";
import { handleTokenRequest } from "./request";

const createMockClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "oidc_1",
    clientSecret: "super-s3cret",
    tokenEndpointAuthMethod: "client_secret_basic", // Default auth method
    redirectUris: ["https://client.test/cb"],
    idTokenSignedResponseAlg: "RS256",
    // Add other necessary client properties
    issuer: configuration.baseUrl, // Assume baseUrl is set correctly
    subjectType: "public",
    ...overrides,
  }) as Client;

// Creates mock Authorization Code data structure
const createMockCodeData = (
  client: Client, // Associated client
  overrides: Partial<AuthorizationCode> = {},
): AuthorizationCode =>
  ({
    id: `oidc_code_${Math.random().toString(36).substring(2)}`, // Unique ID per code
    redirectUri: client.redirectUris[0], // Default to first URI
    userId: "usr_token_1",
    authTime: new Date(Date.now() - 60000), // 1 minute ago
    createdAt: new Date(), // Now
    nonce: "default-nonce",
    scopes: ["openid", "profile"], // Default scopes
    claims: {}, // Default claims request from auth phase
    ...overrides,
  }) as AuthorizationCode;

// Creates the POST request to the token endpoint
const makeTokenRequest = ({
  body,
  headers,
}: {
  body: Record<string, string | undefined>; // Use object for easier construction
  headers?: Record<string, string>;
}) => {
  // Filter out undefined values from body before creating URLSearchParams
  const filteredBody: Record<string, string> = {};
  for (const key in body) {
    if (body[key] !== undefined) {
      filteredBody[key] = body[key] as string;
    }
  }

  const qs = new URLSearchParams();
  for (const key in filteredBody) {
    qs.append(key, filteredBody[key]);
  }

  return new Request(`${configuration.baseUrl}/token`, {
    // Use configured base URL
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Add other necessary headers like Host, X-Forwarded-Proto if required by handler
      Host: new URL(configuration.baseUrl).host,
      "X-Forwarded-Proto": "https",
      ...headers,
    },
    body: qs.toString(),
  });
};

describe("handleTokenRequest (Token Endpoint)", () => {
  let mockClient: Client;
  let mockCode: AuthorizationCode;
  let getCodeSpy = vi.spyOn(configuration, "getCode");
  let revokeCodeSpy = vi.spyOn(configuration, "revokeCode");
  let createAccessTokenSpy = vi.spyOn(configuration, "createAccessToken");
  let getClaimsSpy = vi.spyOn(configuration, "getClaims");

  const defaultAccessTokenId = "default_access_token_id";
  const defaultUserClaims = {
    sub: "usr_token_1",
    name: "Token User",
    given_name: "Token",
    family_name: "User",
    email: "token.user@example.com",
  };

  beforeEach(() => {
    mockClient = createMockClient();
    mockCode = createMockCodeData(mockClient);

    // --- Mock Configuration Dependencies ---
    vi.spyOn(configuration, "getClient").mockResolvedValue(mockClient); // Used by authenticateClient implicitly

    // Mock getCode: by default, finds the mockCode and associated mockClient
    getCodeSpy = vi
      .spyOn(configuration, "getCode")
      .mockImplementation(async (codeId: string) => {
        if (codeId === mockCode.id) {
          // Simulate expiry check: return undefined if code is too old (e.g., > 1 min)
          const codeAgeSeconds =
            (Date.now() - mockCode.createdAt!.getTime()) / 1000;
          if (codeAgeSeconds > 60) {
            return undefined; // Code expired
          }
          return { code: mockCode, client: mockClient };
        }
        return undefined; // Code not found
      });

    // Mock revokeCode
    revokeCodeSpy = vi
      .spyOn(configuration, "revokeCode")
      .mockResolvedValue(undefined);

    // Mock createAccessToken
    createAccessTokenSpy = vi
      .spyOn(configuration, "createAccessToken")
      .mockResolvedValue({ id: defaultAccessTokenId });

    // Mock getClaims (needed for ID Token)
    getClaimsSpy = vi
      .spyOn(configuration, "getClaims")
      .mockResolvedValue(defaultUserClaims); // Return default claims
  });

  // Basic validation tests
  it("returns 400 (invalid_request) if grant_type is missing", async () => {
    const response = await handleTokenRequest(makeTokenRequest({ body: {} })); // Empty body
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
    });
  });

  it("returns 400 (unsupported_grant_type) if grant_type is not supported", async () => {
    const response = await handleTokenRequest(
      makeTokenRequest({ body: { grant_type: "password" } }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "unsupported_grant_type",
    });
  });

  // --- grant_type=authorization_code tests ---
  describe("when grant_type=authorization_code", () => {
    const grantType = "authorization_code";
    // Helper for basic auth header using beforeEach's mockClient
    let basicAuthHeader: string;
    beforeEach(() => {
      basicAuthHeader = `Basic ${Buffer.from(`${mockClient.clientId}:${mockClient.clientSecret}`).toString("base64")}`;
    });

    it("returns 400 (invalid_request) if code parameter is missing", async () => {
      const response = await handleTokenRequest(
        makeTokenRequest({ body: { grant_type: grantType } }),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "invalid_request",
      });
    });

    it("returns 400 (invalid_grant) if code is invalid or not found", async () => {
      getCodeSpy.mockResolvedValue(undefined); // Ensure getCode returns nothing
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: { grant_type: grantType, code: "invalid_code" },
          headers: { Authorization: basicAuthHeader }, // Auth passes
        }),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "invalid_grant",
      });
      expect(getCodeSpy).toHaveBeenCalledWith("invalid_code");
    });

    it("returns 400 (invalid_grant) if code is expired", async () => {
      // Arrange: Make the mock code seem old
      mockCode.createdAt = new Date(Date.now() - 90 * 1000); // 90 seconds ago (older than 60s check in mock)

      const response = await handleTokenRequest(
        makeTokenRequest({
          body: { grant_type: grantType, code: mockCode.id },
          headers: { Authorization: basicAuthHeader },
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "invalid_grant",
      });
      expect(getCodeSpy).toHaveBeenCalledWith(mockCode.id);
    });

    it("returns 401 (invalid_client) if client authentication fails", async () => {
      // No Authorization header provided, and client requires basic auth
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: { grant_type: grantType, code: mockCode.id },
          // No headers
        }),
      );
      expect(response.status).toBe(401); // Should be 401 according to RFC6749 Client Auth section
      await expect(response.json()).resolves.toEqual({
        error: "invalid_client",
      });
      expect(getCodeSpy).toHaveBeenCalledWith(mockCode.id); // Code lookup should still happen
    });

    it("returns 400 (invalid_grant) if redirect_uri is provided but does not match code's redirect_uri", async () => {
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: {
            grant_type: grantType,
            code: mockCode.id,
            redirect_uri: "https://wrong.uri/cb", // Doesn't match mockCode.redirectUri
          },
          headers: { Authorization: basicAuthHeader },
        }),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "invalid_grant",
      });
      expect(getCodeSpy).toHaveBeenCalledWith(mockCode.id);
    });

    it("succeeds if redirect_uri is provided and matches", async () => {
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: {
            grant_type: grantType,
            code: mockCode.id,
            redirect_uri: mockCode.redirectUri, // Matches!
          },
          headers: { Authorization: basicAuthHeader },
        }),
      );
      expect(response.status).toBe(200); // Should succeed
    });

    // --- PKCE Tests ---
    describe("with PKCE", () => {
      const pkceChallenge = "k2oYXKqiZrucvpgengXLeM1zKwsygOuURBK7b4-PB68"; // sha256('helloworld')
      const pkceMethod = "S256";
      const correctVerifier = "helloworld";
      const incorrectVerifier = "goodbyeworld";

      beforeEach(() => {
        // Mock getCode to return a code requiring PKCE
        mockCode = createMockCodeData(mockClient, {
          codeChallenge: pkceChallenge,
          codeChallengeMethod: pkceMethod,
        });
        getCodeSpy.mockImplementation(async (codeId: string) =>
          codeId === mockCode.id
            ? { code: mockCode, client: mockClient }
            : undefined,
        );
      });

      it("returns 400 (invalid_request) if code_verifier is missing when challenge was present", async () => {
        const response = await handleTokenRequest(
          makeTokenRequest({
            body: { grant_type: grantType, code: mockCode.id }, // Missing code_verifier
            headers: { Authorization: basicAuthHeader },
          }),
        );
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
          error: "invalid_request",
        });
      });

      it("returns 400 (invalid_grant) if code_verifier does not match challenge", async () => {
        const response = await handleTokenRequest(
          makeTokenRequest({
            body: {
              grant_type: grantType,
              code: mockCode.id,
              code_verifier: incorrectVerifier, // Wrong verifier
            },
            headers: { Authorization: basicAuthHeader },
          }),
        );
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
          error: "invalid_grant",
        });
      });

      it("succeeds if code_verifier matches the challenge", async () => {
        const response = await handleTokenRequest(
          makeTokenRequest({
            body: {
              grant_type: grantType,
              code: mockCode.id,
              code_verifier: correctVerifier, // Correct verifier
            },
            headers: { Authorization: basicAuthHeader },
          }),
        );
        expect(response.status).toBe(200); // PKCE passes
      });
    });

    // --- Success Case & Token Issuance ---
    it("succeeds, revokes code, and returns tokens (including ID token for openid scope)", async () => {
      // Arrange: Uses default mocks from beforeEach (valid code, client, openid scope)

      // Act
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: { grant_type: grantType, code: mockCode.id },
          headers: { Authorization: basicAuthHeader },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toMatch(/application\/json/);
      expect(getCodeSpy).toHaveBeenCalledWith(mockCode.id);
      expect(createAccessTokenSpy).toHaveBeenCalledTimes(1);
      expect(createAccessTokenSpy).toHaveBeenCalledWith({
        clientId: mockClient.clientId,
        userId: mockCode.userId,
        scopes: mockCode.scopes,
        claims: mockCode.claims, // Pass claims request through
        nonce: mockCode.nonce,
        expiresAt: expect.any(Date), // Check if expiry is set
      });
      expect(getClaimsSpy).toHaveBeenCalledTimes(1); // For ID token
      expect(revokeCodeSpy).toHaveBeenCalledTimes(1);
      expect(revokeCodeSpy).toHaveBeenCalledWith(mockCode.id);

      // Check response body
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toEqual({
        access_token: defaultAccessTokenId,
        token_type: "Bearer",
        expires_in: 3600, // Assuming default expiry
        id_token: expect.any(String), // ID token should be present
      });

      // Verify ID token payload
      const idTokenParts = (body.id_token as string).split(".");
      expect(idTokenParts).toHaveLength(3);
      const idTokenPayload = JSON.parse(
        Buffer.from(idTokenParts[1], "base64").toString(),
      );
      expect(idTokenPayload).toMatchObject({
        iss: configuration.baseUrl,
        sub: mockCode.userId,
        aud: mockClient.clientId,
        exp: expect.any(Number),
        iat: expect.any(Number),
        auth_time: Math.floor(mockCode.authTime.getTime() / 1000),
        nonce: mockCode.nonce,
        // Add checks for at_hash, c_hash if implemented/needed
      });
    });

    it("returns specific claims requested in the id_token via code's claims data", async () => {
      // Arrange: Mock code with specific claims request
      mockCode = createMockCodeData(mockClient, {
        claims: { id_token: { given_name: null, email: { essential: true } } },
      });
      getCodeSpy.mockResolvedValue({ code: mockCode, client: mockClient });
      // Mock getClaims to return the necessary data
      getClaimsSpy.mockResolvedValue({
        sub: mockCode.userId,
        given_name: "Claimed GivenName",
        email: "claimed.email@example.com",
      });

      // Act
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: { grant_type: grantType, code: mockCode.id },
          headers: { Authorization: basicAuthHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Record<string, unknown>;
      const idTokenPayload = JSON.parse(
        Buffer.from(
          (body.id_token as string).split(".")[1],
          "base64",
        ).toString(),
      );

      expect(idTokenPayload).toHaveProperty("given_name", "Claimed GivenName");
      expect(idTokenPayload).toHaveProperty(
        "email",
        "claimed.email@example.com",
      );
      expect(idTokenPayload).not.toHaveProperty("family_name");
      expect(idTokenPayload).toHaveProperty("nonce", mockCode.nonce);
      // Check that getClaims was called with the correct list
      expect(getClaimsSpy).toHaveBeenCalledWith(
        mockCode.userId,
        expect.arrayContaining(["given_name", "email"]),
      );
    });

    it("does not return an id_token if code lacks 'openid' scope", async () => {
      // Arrange: Mock code without 'openid' scope
      mockCode = createMockCodeData(mockClient, {
        scopes: ["profile", "email"],
      });
      getCodeSpy.mockResolvedValue({ code: mockCode, client: mockClient });

      // Act
      const response = await handleTokenRequest(
        makeTokenRequest({
          body: { grant_type: grantType, code: mockCode.id },
          headers: { Authorization: basicAuthHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).not.toHaveProperty("id_token"); // ID token absent
      expect(body).toHaveProperty("access_token", defaultAccessTokenId); // Still get access token
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in", 3600);

      expect(getClaimsSpy).not.toHaveBeenCalled(); // No claims needed for ID token
      expect(createAccessTokenSpy).toHaveBeenCalledTimes(1);
      expect(revokeCodeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
