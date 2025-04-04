import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the function to test
import { Result } from "neverthrow";
import type { Client, Session } from "../configuration";
import configuration from "../configuration";
import { createIdToken } from "../idToken";
import type { AuthorizationResult } from "./request"; // Import type
import { performOidcAuthorization } from "./request"; // Adjust path

// --- Factory Functions (reuse or define) ---
const createMockInputParams = (
  data: Record<string, string | undefined> = {},
): Record<string, string | undefined> => ({
  // Basic valid request params
  response_type: "code",
  client_id: "oidc_1",
  scope: "openid profile",
  redirect_uri: "https://client.test/cb",
  state: "state-val-123",
  nonce: "nonce-val-456",
  ...data,
});

const createMockClient = (overrides: Partial<Client> = {}): Client => ({
  issuer: "https://idp.example.com",
  clientId: "oidc_1",
  clientSecret: "secret",
  redirectUris: ["https://client.test/cb", "https://client.test/cb2"],
  idTokenSignedResponseAlg: "RS256",
  userinfoSignedResponseAlg: "RS256",
  tokenEndpointAuthMethod: "client_secret_basic",
  subjectType: "public",
  defaultMaxAge: undefined,
  // Add other necessary properties
  ...overrides,
});

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  userId: `user-main-${Math.random().toString(36).substring(7)}`,
  lastAuthenticatedAt: new Date(Date.now() - 180000), // 3 minutes ago
  ...overrides,
});

// Dummy crypto keys for mocking dependencies of decodeIdToken/createIdToken
const mockPublicKey: CryptoKey = { type: "public" } as CryptoKey;
const mockPrivateKey: CryptoKey = { type: "private" } as CryptoKey;

// --- Test Suite ---
describe("performOidcAuthorization", () => {
  let mockClient: Client = createMockClient();

  beforeEach(() => {
    vi.spyOn(configuration, "getClient").mockResolvedValue(mockClient);
  });

  describe("Preflight Checks (Critical Errors - return Err)", () => {
    it("returns Err('missing_client_id') if client_id is missing", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ client_id: undefined }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("missing_client_id");
    });

    it("returns Err('invalid_client_id') if client cannot be found", async () => {
      vi.spyOn(configuration, "getClient").mockResolvedValue(undefined);
      const result = await performOidcAuthorization(
        createMockInputParams({ client_id: "unknown" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("invalid_client_id");
    });

    it("returns Err('missing_response_type') if response_type is missing", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ response_type: undefined }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("missing_response_type");
    });

    it("returns Err('unsupported_response_type') if response_type is not supported", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ response_type: "bad_type" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("unsupported_response_type");
    });

    it("returns Err('request_and_request_uri') if both request and request_uri are present", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ request: "req", request_uri: "uri" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("request_and_request_uri");
    });

    it("returns Err('request_uri_not_supported') if request_uri is present", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ request_uri: "uri" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("request_uri_not_supported"); // Assuming not implemented
    });

    it("returns Err('request_not_supported') if request is present", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ request: "req" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("request_not_supported"); // Assuming not implemented
    });

    it("returns Err('missing_redirect_uri') if redirect_uri is missing", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ redirect_uri: undefined }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("missing_redirect_uri");
    });

    it("returns Err('invalid_redirect_uri') if redirect_uri is not registered for the client", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ redirect_uri: "https://bad.host/cb" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("invalid_redirect_uri");
    });

    it("returns Err('bad_response_mode') if response_mode is provided but not supported", async () => {
      // Assuming 'unsupported_mode' is not in RESPONSE_MODES_SUPPORTED
      const result = await performOidcAuthorization(
        createMockInputParams({ response_mode: "unsupported_mode" }),
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("bad_response_mode");
    });
  });

  describe("Parameter Validation (Redirect Errors - return Ok(REDIRECT))", () => {
    const expectRedirectError = (
      result: Result<AuthorizationResult, string>,
      error: string,
      state?: string,
    ) => {
      expect(result.isOk()).toBe(true);
      const value = result._unsafeUnwrap();
      expect(value.nextStep).toBe("REDIRECT");
      expect(value.url).toBeDefined();
      const url = new URL(value.url!);

      if (value.params.response_mode === "fragment") {
        expect(url.hash).toContain("error=" + error);
        expect(url.hash).toContain("state=" + (state ?? ""));
      } else {
        expect(url.search).toContain("error=" + error);
        expect(url.search).toContain("state=" + (state ?? ""));
      }
    };

    it("returns 'implicit_missing_nonce' error if response_type includes id_token but nonce is missing", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({
          response_type: "code id_token",
          nonce: undefined,
        }),
      );
      expectRedirectError(result, "implicit_missing_nonce", "state-val-123");
    });

    it("returns 'invalid_request' error if claims parameter is invalid JSON", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ claims: "{ bad json" }),
      );
      expectRedirectError(result, "invalid_request", "state-val-123");
    });

    it("returns 'invalid_request' error if claims parameter is not a valid Claims object (e.g., wrong structure)", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({
          claims: JSON.stringify({ userinfo: ["email"] }),
        }),
      ); // Array instead of object
      expectRedirectError(result, "invalid_request", "state-val-123");
    });

    it("returns 'invalid_request' error if max_age is not a non-negative integer string", async () => {
      const result1 = await performOidcAuthorization(
        createMockInputParams({ max_age: "-5" }),
      );
      expectRedirectError(result1, "invalid_request", "state-val-123");

      const result2 = await performOidcAuthorization(
        createMockInputParams({ max_age: "abc" }),
      );
      expectRedirectError(result2, "invalid_request", "state-val-123");
    });

    it("accepts max_age=0", async () => {
      // max_age=0 forces login
      const result = await performOidcAuthorization(
        createMockInputParams({ max_age: "0" }),
      );
      expect(result.isOk()).toBe(true);
      // Expect delegation to SIGN_IN path
      expect(result._unsafeUnwrap().nextStep).toBe("SIGN_IN");
      expect(result._unsafeUnwrap().params.max_age).toBe(0);
    });

    it("accepts valid claims JSON", async () => {
      const claims = { userinfo: { email: null } };
      // Expect it not to fail validation (will proceed to delegation)
      const result = await performOidcAuthorization(
        createMockInputParams({ claims: JSON.stringify(claims) }),
      );
      expect(result.isOk()).toBe(true);
      // Check that claims object was parsed correctly onto params
      expect(result._unsafeUnwrap().params.claims).toMatchObject({
        userinfo: expect.objectContaining({
          email: null,
          // Additional claims are set by the "profile" scope
        }),
      });
      // It should delegate; default is SIGN_IN as no sessions mocked yet
      expect(result._unsafeUnwrap().nextStep).toBe("SIGN_IN");
    });
  });

  describe("OAuth2 Request Handling (No 'openid' scope)", () => {
    const expectRedirectError = (
      result: Result<AuthorizationResult, string>,
      error: string,
      state?: string,
    ) => {
      /* ... as above ... */
    };

    it("proceeds normally if only OAuth2 params are used (response_type=code)", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "api:read", response_type: "code" }),
      );
      expect(result.isOk()).toBe(true);
      // Default delegation without openid often leads to consent/confirm or code issuance directly
      // Depending on implementation, let's assume it asks for consent for the scope
      expect(result._unsafeUnwrap().nextStep).toBe("SIGN_IN"); // No sessions mocked -> SIGN_IN
    });

    it("proceeds normally if only OAuth2 params are used (response_type=token)", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "api:read", response_type: "token" }),
      );
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().nextStep).toBe("SIGN_IN");
    });

    it("returns 'invalid_request' if OIDC-specific params like id_token_hint are used", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "api:read", id_token_hint: "hint" }),
      );
      expectRedirectError(result, "invalid_request", "state-val-123");
    });

    it("returns 'invalid_request' if OIDC-specific params like max_age are used", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "api:read", max_age: "60" }),
      );
      expectRedirectError(result, "invalid_request", "state-val-123");
    });

    it("returns 'invalid_request' if OIDC-specific prompt like 'login' is used", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "api:read", prompt: "login" }),
      );
      expectRedirectError(result, "invalid_request", "state-val-123");
    });

    it("returns 'invalid_request' if response_type includes id_token", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({
          scope: "api:read",
          response_type: "code id_token",
        }),
      );
      expectRedirectError(result, "invalid_request", "state-val-123");
    });

    it("allows prompt=consent", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({
          scope: "api:read",
          response_type: "code",
          prompt: "consent",
        }),
      );
      expect(result.isOk()).toBe(true);
      // Should delegate to authorizationAny, which likely leads to CONSENT if session exists, or SIGN_IN
      expect(result._unsafeUnwrap().nextStep).toBe("SIGN_IN"); // No sessions mocked
    });
  });

  describe("scopesToClaims Handling", () => {
    it("converts 'profile' scope to userinfo claims", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "openid profile" }),
      );
      expect(result.isOk()).toBe(true);
      const claims = result._unsafeUnwrap().params.claims?.userinfo;
      expect(claims).toBeDefined();
      expect(claims).toHaveProperty("name", null);
      expect(claims).toHaveProperty("family_name", null);
      // ... check other profile claims
    });

    it("converts 'email' scope to userinfo claims", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ scope: "openid email" }),
      );
      expect(result.isOk()).toBe(true);
      const claims = result._unsafeUnwrap().params.claims?.userinfo;
      expect(claims).toBeDefined();
      expect(claims).toHaveProperty("email", null);
      expect(claims).toHaveProperty("email_verified", null);
    });

    it("merges scope claims with existing claims parameter, preferring claims parameter", async () => {
      const claimsParam = {
        userinfo: { email: { essential: true }, given_name: null },
      };
      const result = await performOidcAuthorization(
        createMockInputParams({
          scope: "openid profile email", // profile adds given_name, email adds email
          claims: JSON.stringify(claimsParam),
        }),
      );
      expect(result.isOk()).toBe(true);
      const finalClaims = result._unsafeUnwrap().params.claims;
      expect(finalClaims?.userinfo).toBeDefined();
      expect(finalClaims?.userinfo?.email).toEqual({ essential: true }); // Preserved from claims param
      expect(finalClaims?.userinfo?.given_name).toBeNull(); // Merged (present in both)
      expect(finalClaims?.userinfo).toHaveProperty("family_name", null); // Added from profile scope
    });
  });

  describe("id_token_hint Handling", async () => {
    const mockSub = "user-from-hint";
    const fakeValidHint = await createIdToken(mockClient, mockSub, {});

    beforeEach(() => {
      vi.spyOn(configuration, "getClient").mockResolvedValue(mockClient);
    });

    it("extracts sub from a valid id_token_hint and sets it on params", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ id_token_hint: fakeValidHint }),
      );
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().params.id_token_hint).toBe(mockSub); // Check the extracted sub
      expect(configuration.getJwk).toHaveBeenCalled(); // Verify dependency was called
    });

    it("sets id_token_hint on params to undefined if hint is invalid or decoding fails", async () => {
      const result1 = await performOidcAuthorization(
        createMockInputParams({ id_token_hint: "invalid jwt" }),
      );
      expect(result1.isOk()).toBe(true);
      expect(result1._unsafeUnwrap().params.id_token_hint).toBeUndefined();

      // Simulate decodeIdToken failure (e.g., wrong issuer)
      const wrongIssuerHint =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWZyb20taGludCIsImlzcyI6Imh0dHBzOi8vd3JvbmcuaXNzdWVyIn0.fakesig";
      const result2 = await performOidcAuthorization(
        createMockInputParams({ id_token_hint: wrongIssuerHint }),
      );
      expect(result2.isOk()).toBe(true);
      expect(result2._unsafeUnwrap().params.id_token_hint).toBeUndefined();
    });

    it("sets id_token_hint on params to undefined if hint is missing", async () => {
      const result = await performOidcAuthorization(
        createMockInputParams({ id_token_hint: undefined }),
      );
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().params.id_token_hint).toBeUndefined();
      expect(configuration.getJwk).not.toHaveBeenCalled(); // decodeIdToken shouldn't be called
    });
  });

  describe("Delegation Logic", () => {
    let session1: Session;
    let session2: Session;

    beforeEach(() => {
      session1 = createMockSession({ userId: "user1-delegate" });
      session2 = createMockSession({ userId: "user2-delegate" });
    });

    describe("when prompt=none", () => {
      it("delegates to authorizationNone and returns Ok(result)", async () => {
        vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
          session1,
        ]);

        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: "none" }),
        );

        expect(result.isOk()).toBe(true);
        const value = result._unsafeUnwrap();
        expect(value.nextStep).toBe("REDIRECT");
        expect(value.url).toContain("error=");
      });
    });

    describe("when prompt=select_account", () => {
      it("returns Ok({ nextStep: 'SELECT_ACCOUNT' }) directly", async () => {
        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: "select_account" }),
        );
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().nextStep).toBe("SELECT_ACCOUNT");
        expect(result._unsafeUnwrap().params.prompt).toBe("select_account");
        expect(configuration.getActiveSessions).not.toHaveBeenCalled();
      });
    });

    describe("when prompt=login", () => {
      it("sets max_age=0 and delegates to authorizationAny", async () => {
        // Example: One session exists, consent exists -> should go to CONFIRM despite prompt=login forcing re-auth via max_age=0 in authorizationAny
        vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
          session1,
        ]);
        vi.spyOn(configuration, "getConsent").mockResolvedValue({
          scopes: ["openid", "profile"],
          claims: [],
        });

        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: "login" }),
        );

        expect(result.isOk()).toBe(true);
        // Check max_age was set before delegation
        expect(result._unsafeUnwrap().params.max_age).toBe(0);
        // authorizationAny with max_age=0 should eventually lead to SIGN_IN if getActiveSessions respects it
        // Let's adjust the mock to simulate getActiveSessions filtering by max_age=0
        vi.spyOn(configuration, "getActiveSessions").mockImplementation(
          async (maxAge) => {
            expect(maxAge).toBe(0); // Verify max_age=0 was passed
            return []; // No sessions are recent enough
          },
        );

        const resultAfterFilter = await performOidcAuthorization(
          createMockInputParams({ prompt: "login" }),
        );
        expect(resultAfterFilter.isOk()).toBe(true);
        expect(resultAfterFilter._unsafeUnwrap().nextStep).toBe("SIGN_IN"); // Because max_age=0 filtered out the session
      });
    });

    describe("when prompt=consent", () => {
      it("delegates to authorizationAny", async () => {
        // TODO: Verify consent deletion logic if implemented
        // Example: One session, no consent -> CONSENT
        vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
          session1,
        ]);

        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: "consent" }),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().nextStep).toBe("CONSENT");
        expect(result._unsafeUnwrap().userId).toBe(session1.userId);
        expect(configuration.getActiveSessions).toHaveBeenCalledTimes(1);
      });
    });

    describe("when prompt is undefined/default", () => {
      it("delegates to authorizationAny (e.g., SIGN_IN if no sessions)", async () => {
        // Default beforeEach has no sessions
        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: undefined }),
        );
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().nextStep).toBe("SIGN_IN");
      });

      it("delegates to authorizationAny (e.g., SELECT_ACCOUNT if multiple sessions)", async () => {
        vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
          session1,
          session2,
        ]);
        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: undefined }),
        );
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().nextStep).toBe("SELECT_ACCOUNT");
      });

      it("delegates to authorizationAny (e.g., CONFIRM if one session with consent)", async () => {
        vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
          session1,
        ]);
        vi.spyOn(configuration, "getConsent").mockResolvedValue({
          scopes: ["openid", "profile"],
          // an user that has previously consented to "profile" must also have consented to a number of claims
          claims: [
            "name",
            "family_name",
            "given_name",
            "middle_name",
            "nickname",
            "preferred_username",
            "profile",
            "picture",
            "website",
            "gender",
            "birthdate",
            "zoneinfo",
            "locale",
            "updated_at",
          ],
        });
        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: undefined }),
        );
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().nextStep).toBe("CONFIRM");
        expect(result._unsafeUnwrap().userId).toBe(session1.userId);
      });

      it("delegates to authorizationAny (e.g., CONSENT if one session without consent)", async () => {
        vi.spyOn(configuration, "getActiveSessions").mockResolvedValue([
          session1,
        ]);
        vi.spyOn(configuration, "getConsent").mockResolvedValue({
          scopes: [],
          claims: [],
        }); // No consent
        const result = await performOidcAuthorization(
          createMockInputParams({ prompt: undefined }),
        );
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().nextStep).toBe("CONSENT");
        expect(result._unsafeUnwrap().userId).toBe(session1.userId);
      });
    });
  });

  // Test TODOs from code (request/request_uri if implemented later)
  // ...
}); // End describe("performOidcAuthorization")
