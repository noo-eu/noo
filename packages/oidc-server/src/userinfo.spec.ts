import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccessToken, Client } from "./configuration";
import configuration from "./configuration";
import { handleUserinfo } from "./userinfo";

const createMockClient = (overrides: Partial<Client> = {}): Client =>
  ({
    issuer: configuration.baseUrl,
    clientId: "oidc_1",
    clientSecret: "super-s3cret",
    tokenEndpointAuthMethod: "client_secret_basic",
    redirectUris: ["https://client.test/cb"],
    idTokenSignedResponseAlg: "RS256",
    userinfoSignedResponseAlg: "none",
    ...overrides,
  }) as Client;

const createMockAccessTokenData = (
  overrides: Partial<AccessToken> = {},
): AccessToken => ({
  id: `at_${Math.random().toString(36).substring(7)}`,
  userId: "usr_1",
  scopes: ["openid", "profile", "email"],
  claims: { userinfo: { name: null, email: null } },
  ...overrides,
});

const makeUserinfoRequest = ({
  method = "GET", // UserInfo often uses GET or POST with Bearer token
  headers,
  body, // Only relevant for POST with form parameter
}: {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: Record<string, string>;
} = {}) => {
  const defaultHeaders = {
    "X-Forwarded-Proto": "https",
    Host: new URL(configuration.baseUrl).host,
    ...headers,
  } as Record<string, string>;

  let requestBody: string | null = null;
  if (method === "POST" && body) {
    defaultHeaders["Content-Type"] = "application/x-www-form-urlencoded";
    requestBody = new URLSearchParams(body).toString();
  }

  return new Request(`${configuration.baseUrl}/userinfo`, {
    method: method,
    headers: defaultHeaders,
    body: requestBody,
  });
};

let getAccessTokenSpy = vi.spyOn(configuration, "getAccessToken");
let getClaimsSpy = vi.spyOn(configuration, "getClaims");

describe("handleUserinfo Endpoint", () => {
  let mockClient: Client;
  let mockAccessToken: AccessToken;

  const defaultUserClaims = {
    sub: "usr_1", // Should always match token's userId
    name: "Test User",
    given_name: "Test",
    family_name: "User",
    email: "test.user@example.com",
    email_verified: true,
    picture: "https://example.com/picture.jpg",
  };

  beforeEach(() => {
    mockClient = createMockClient();
    mockAccessToken = createMockAccessTokenData();

    getAccessTokenSpy = vi
      .spyOn(configuration, "getAccessToken")
      .mockImplementation(async (tokenId: string) => {
        if (tokenId === mockAccessToken.id) {
          return {
            client: mockClient,
            accessToken: mockAccessToken,
          };
        }
        return undefined;
      });

    // Default mock for getClaims: returns a standard set of claims for the user
    getClaimsSpy = vi
      .spyOn(configuration, "getClaims")
      .mockImplementation(async (userId, requestedClaimsList) => {
        if (userId === mockAccessToken.userId) {
          // Filter the default claims based on what was requested (simulating IdP logic)
          const availableClaims = {
            ...defaultUserClaims,
            sub: userId,
          } as Record<string, unknown>;
          const returnedClaims = { sub: userId } as Record<string, unknown>;
          requestedClaimsList.forEach((claim) => {
            if (claim in availableClaims) {
              returnedClaims[claim] = availableClaims[claim];
            }
          });
          return returnedClaims;
        }
        return { sub: userId }; // Return at least sub for other users
      });

    // Spy on getClient if userinfo handler uses it
    vi.spyOn(configuration, "getClient").mockResolvedValue(mockClient);
  });

  it("returns 401 Unauthorized if no Authorization header or access_token parameter is provided", async () => {
    const response = await handleUserinfo(makeUserinfoRequest()); // No token provided
    expect(response.status).toBe(401);
    expect(getAccessTokenSpy).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized if Bearer token is invalid or not found", async () => {
    const invalidTokenId = "invalid-token";
    getAccessTokenSpy.mockImplementation(async (tokenId: string) => {
      expect(tokenId).toBe(invalidTokenId);
      return undefined;
    });

    const response = await handleUserinfo(
      makeUserinfoRequest({
        headers: { Authorization: `Bearer ${invalidTokenId}` },
      }),
    );

    expect(response.status).toBe(401);
    expect(getAccessTokenSpy).toHaveBeenCalledWith(invalidTokenId);
  });

  it("returns 401 Unauthorized if access_token form parameter is invalid or not found", async () => {
    const invalidTokenId = "invalid-form-token";
    getAccessTokenSpy.mockImplementation(async (tokenId: string) => {
      expect(tokenId).toBe(invalidTokenId);
      return undefined;
    });

    const response = await handleUserinfo(
      makeUserinfoRequest({
        method: "POST",
        body: { access_token: invalidTokenId },
      }),
    );

    expect(response.status).toBe(401);
    expect(getAccessTokenSpy).toHaveBeenCalledWith(invalidTokenId);
  });

  it("returns 401 Unauthorized if token is expired", async () => {
    const expiredToken = createMockAccessTokenData({});

    // Mock getAccessToken to return undefined (as if it filters expired tokens)
    // OR return the expired token and let handleUserinfo check expiry
    getAccessTokenSpy.mockImplementation(async (tokenId: string) => {
      return undefined; // Simulate expired token
    });

    const response = await handleUserinfo(
      makeUserinfoRequest({
        headers: { Authorization: `Bearer ${expiredToken.id}` },
      }),
    );

    expect(response.status).toBe(401);
    expect(getAccessTokenSpy).toHaveBeenCalledWith(expiredToken.id);
  });

  it("returns 403 Forbidden if access token does not have 'openid' scope", async () => {
    const noOpenIdToken = createMockAccessTokenData({
      scopes: ["profile", "email"], // Missing 'openid'
    });
    // Mock getAccessToken to return this specific token
    getAccessTokenSpy.mockImplementation(async (tokenId: string) => {
      if (tokenId === noOpenIdToken.id) {
        return { client: mockClient, accessToken: noOpenIdToken };
      }
      return undefined;
    });

    const response = await handleUserinfo(
      makeUserinfoRequest({
        headers: { Authorization: `Bearer ${noOpenIdToken.id}` },
      }),
    );

    expect(response.status).toBe(403);
    expect(getAccessTokenSpy).toHaveBeenCalledWith(noOpenIdToken.id);
    expect(getClaimsSpy).not.toHaveBeenCalled(); // Should fail before fetching claims
  });

  it("returns 200 OK and user claims for a valid Bearer token with 'openid' scope", async () => {
    const response = await handleUserinfo(
      makeUserinfoRequest({
        headers: { Authorization: `Bearer ${mockAccessToken.id}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(getAccessTokenSpy).toHaveBeenCalledWith(mockAccessToken.id);

    // Check that getClaims was called correctly based on token scopes
    // Assuming 'profile' -> name, given_name, family_name, picture and 'email' -> email, email_verified
    const expectedClaimsToFetch = expect.arrayContaining([
      "name",
      "email",
      // and more
    ]);
    expect(getClaimsSpy).toHaveBeenCalledWith(
      mockAccessToken.userId,
      expectedClaimsToFetch,
    );

    const body = await response.json();

    expect(body).toMatchObject({
      sub: mockAccessToken.userId,
      name: defaultUserClaims.name,
    });

    expect(body).toHaveProperty("iss"); // Should be present
    expect(body).toHaveProperty("aud"); // Should be present
    expect(body).toHaveProperty("exp"); // Should be present
    expect(body).toHaveProperty("iat"); // Should be present
  });

  it("returns 200 OK and user claims for a valid access_token form parameter", async () => {
    const response = await handleUserinfo(
      makeUserinfoRequest({
        method: "POST",
        body: { access_token: mockAccessToken.id },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(getAccessTokenSpy).toHaveBeenCalledWith(mockAccessToken.id);
    const expectedClaimsToFetch = expect.arrayContaining(["name", "email"]); // Adjust based on scopes
    expect(getClaimsSpy).toHaveBeenCalledWith(
      mockAccessToken.userId,
      expectedClaimsToFetch,
    );
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({ sub: mockAccessToken.userId }),
    );
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("email");
  });

  it("returns only claims allowed by token claims configuration", async () => {
    const limitedScopeToken = createMockAccessTokenData({
      scopes: ["openid", "profile"],
      // Simulate a claim request during auth limiting userinfo response
      claims: { userinfo: { name: null, email: null, email_verified: null } },
    });

    getAccessTokenSpy.mockImplementation(async (tokenId: string) => {
      if (tokenId === limitedScopeToken.id) {
        return { client: mockClient, accessToken: limitedScopeToken };
      }
      return undefined;
    });

    const response = await handleUserinfo(
      makeUserinfoRequest({
        headers: { Authorization: `Bearer ${limitedScopeToken.id}` },
      }),
    );

    expect(response.status).toBe(200);
    // handleUserinfo should figure out allowed claims from scopes ('name', 'email', 'email_verified')
    expect(getClaimsSpy).toHaveBeenCalledWith(
      limitedScopeToken.userId,
      expect.arrayContaining(["name", "email", "email_verified"]),
    );

    getClaimsSpy.mockResolvedValue({
      name: defaultUserClaims.name,
      email: defaultUserClaims.email,
      email_verified: defaultUserClaims.email_verified,
    });

    // Re-run Act after refining getClaims mock for this specific case
    const responseAfterRefinedMock = await handleUserinfo(
      makeUserinfoRequest({
        headers: { Authorization: `Bearer ${limitedScopeToken.id}` },
      }),
    );

    const body = await responseAfterRefinedMock.json();
    expect(body).toMatchObject({
      sub: expect.any(String),
      name: defaultUserClaims.name,
      email: defaultUserClaims.email,
      email_verified: defaultUserClaims.email_verified,
    });

    expect(body).not.toHaveProperty("last_name"); // Claim was not consented
  });

  describe("when userinfo signing is configured", () => {
    it("returns claims as a signed JWT (JWS)", async () => {
      mockClient = createMockClient({ userinfoSignedResponseAlg: "RS256" });
      mockAccessToken = createMockAccessTokenData();
      getAccessTokenSpy.mockImplementation(async (tokenId: string) =>
        tokenId === mockAccessToken.id
          ? { client: mockClient, accessToken: mockAccessToken }
          : undefined,
      );
      vi.spyOn(configuration, "getClient").mockResolvedValue(mockClient);

      const response = await handleUserinfo(
        makeUserinfoRequest({
          headers: { Authorization: `Bearer ${mockAccessToken.id}` },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/jwt");
      const bodyJwt = await response.text();
      expect(bodyJwt).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });
  });
});
