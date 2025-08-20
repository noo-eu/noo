import { describe, expect, test, beforeAll } from "vitest";
import type { SuperTest, Test } from "supertest";
import {
  createTestClient,
  makeOidcAuthRequest,
  authenticateUser,
  performAuthorizationRequest,
  giveConsent,
  exchangeCodeForToken,
  fetchUserInfo,
  extractAuthorizationCode,
} from "../../lib/http-integration-utils";

describe("OIDC Authorization HTTP Integration Tests", () => {
  let client: SuperTest<Test>;

  beforeAll(async () => {
    client = await createTestClient();
  });

  describe("Authorization Code Flow", () => {
    test("basic authorization code flow with full HTTP cycle", async () => {
      // Step 1: Authenticate user via HTTP
      const session = await authenticateUser(client);
      expect(session.cookies).toBeDefined();

      // Step 2: Create OIDC authorization request
      const authRequest = makeOidcAuthRequest();

      // Step 3: Perform authorization request via HTTP
      const authResponse = await performAuthorizationRequest(
        client,
        authRequest,
        session,
      );

      // Step 4: Should redirect to consent (or directly to callback with code)
      expect(authResponse.status).toBe(302);
      const location = authResponse.headers.location;
      expect(location).toBeDefined();

      if (location.includes("/oidc/consent")) {
        // Step 4a: Handle consent flow
        const consentResponse = await giveConsent(client, location, session);
        expect(consentResponse.status).toBe(302);

        // Step 4b: Extract authorization code from consent redirect
        const { code, state } = extractAuthorizationCode(
          consentResponse,
          authRequest.state,
        );
        expect(code).toBeDefined();
        expect(state).toBe(authRequest.state);

        // Step 5: Exchange code for access token via HTTP
        const tokenData = await exchangeCodeForToken(client, authRequest, code);
        expect(tokenData).toMatchObject({
          access_token: expect.any(String),
          token_type: "Bearer",
          id_token: expect.any(String),
          expires_in: expect.any(Number),
        });

        // Step 6: Use access token to get user info via HTTP
        const userinfo = await fetchUserInfo(client, tokenData.access_token);
        expect(userinfo).toMatchObject({
          sub: expect.any(String),
          name: expect.any(String),
        });
      } else {
        // Direct redirect with authorization code (if consent not required)
        const { code, state } = extractAuthorizationCode(
          authResponse,
          authRequest.state,
        );
        expect(code).toBeDefined();
        expect(state).toBe(authRequest.state);

        // Continue with token exchange...
        const tokenData = await exchangeCodeForToken(client, authRequest, code);
        expect(tokenData).toMatchObject({
          access_token: expect.any(String),
          token_type: "Bearer",
          id_token: expect.any(String),
        });

        const userinfo = await fetchUserInfo(client, tokenData.access_token);
        expect(userinfo).toMatchObject({
          sub: expect.any(String),
          name: expect.any(String),
        });
      }
    });

    test("authorization code flow with PKCE via HTTP", async () => {
      // Step 1: Authenticate user
      const session = await authenticateUser(client);

      // Step 2: Create OIDC request with PKCE
      const codeVerifier = `challenge-${Math.random().toString(16).slice(2)}`;
      const authRequest = makeOidcAuthRequest({
        code_challenge: codeVerifier,
        code_challenge_method: "plain",
      });

      // Step 3: Perform authorization request
      const authResponse = await performAuthorizationRequest(
        client,
        authRequest,
        session,
      );
      expect(authResponse.status).toBe(302);

      const location = authResponse.headers.location;
      let code: string;

      if (location.includes("/oidc/consent")) {
        // Handle consent flow
        const consentResponse = await giveConsent(client, location, session);
        const codeResult = extractAuthorizationCode(
          consentResponse,
          authRequest.state,
        );
        code = codeResult.code;
      } else {
        // Direct redirect with code
        const codeResult = extractAuthorizationCode(
          authResponse,
          authRequest.state,
        );
        code = codeResult.code;
      }

      // Step 4: Exchange code with PKCE verifier
      const tokenData = await exchangeCodeForToken(client, authRequest, code, {
        code_verifier: codeVerifier,
      });

      expect(tokenData).toMatchObject({
        access_token: expect.any(String),
        token_type: "Bearer",
        id_token: expect.any(String),
      });

      // Step 5: Verify userinfo works
      const userinfo = await fetchUserInfo(client, tokenData.access_token);
      expect(userinfo).toMatchObject({
        sub: expect.any(String),
        name: expect.any(String),
      });
    });
  });

  describe("Authentication Requirements", () => {
    test("authorization request without authentication redirects to signin", async () => {
      const authRequest = makeOidcAuthRequest();

      // Make request without authentication
      const response = await performAuthorizationRequest(client, authRequest);

      // Should redirect to signin page
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/\/signin/);
    });

    test("already signed in user goes to consent or gets code", async () => {
      // First authenticate
      const session = await authenticateUser(client);

      const authRequest = makeOidcAuthRequest();

      // Make authenticated request
      const response = await performAuthorizationRequest(
        client,
        authRequest,
        session,
      );

      // Should redirect to consent page or directly to callback with code
      expect(response.status).toBe(302);
      const location = response.headers.location;
      expect(location).toBeDefined();

      // Should either go to consent or callback with code
      const isConsentFlow = location.includes("/oidc/consent");
      const isCallbackFlow = location.includes("localhost:22999/cb");

      expect(isConsentFlow || isCallbackFlow).toBe(true);
    });
  });
});
