import { discoveryMetadata } from "./discovery";
import { describe, test, expect } from "vitest";

describe("discoveryMetadata", () => {
  describe("public profile", () => {
    test("returns the correct metadata", () => {
      const metadata = discoveryMetadata();

      expect(metadata).toEqual({
        issuer: "https://idp.example.com",
        authorization_endpoint: "https://idp.example.com/authorize",
        token_endpoint: "https://idp.example.com/token",
        userinfo_endpoint: "https://idp.example.com/userinfo",
        jwks_uri: "https://idp.example.com/jwks.json",
        check_session_iframe: "https://idp.example.com/session",
        response_types_supported: expect.arrayContaining([
          "code",
          "id_token",
          "id_token token",
          "code id_token",
          "code token",
          "code id_token token",
          "token",
        ]),
        response_modes_supported: expect.arrayContaining([
          "form_post",
          "query",
          "fragment",
        ]),
        grant_types_supported: expect.arrayContaining([
          "authorization_code",
          "implicit",
          "refresh_token",
        ]),
        subject_types_supported: ["public", "pairwise"],
        scopes_supported: expect.arrayContaining([
          "openid",
          "profile",
          "email",
        ]),
        claims_supported: expect.arrayContaining(["sub", "iss", "exp"]),
        token_endpoint_auth_methods_supported: expect.arrayContaining([
          "client_secret_basic",
          "client_secret_post",
        ]),
        code_challenge_methods_supported: ["S256"],
        ui_locales_supported: ["en", "fr"], // from configuration
        id_token_signing_alg_values_supported: expect.arrayContaining([
          "none",
          "RS256",
        ]),
        request_object_signing_alg_values_supported: expect.arrayContaining([
          "none",
          "RS256",
        ]),
        userinfo_signing_alg_values_supported: expect.arrayContaining([
          "none",
          "RS256",
        ]),
      });
    });
  });

  describe("scoped profile (tenant)", () => {
    test("returns the correct metadata", () => {
      const metadata = discoveryMetadata("tenant", "/org_123");

      expect(metadata).toMatchObject({
        issuer: "https://idp.example.com/org_123",
        authorization_endpoint: "https://idp.example.com/authorize",
        token_endpoint: "https://idp.example.com/token",
        userinfo_endpoint: "https://idp.example.com/userinfo",
        jwks_uri: "https://idp.example.com/jwks.json",
        check_session_iframe: "https://idp.example.com/session",
        registration_endpoint: `https://idp.example.com/org_123/register`,
        end_session_endpoint: `https://idp.example.com/org_123/end_session`,
      });
    });
  });

  describe("fapi2 profile", () => {
    test("returns the correct metadata", () => {
      const metadata = discoveryMetadata("fapi2");

      expect(metadata).toMatchObject({
        issuer: "https://idp.example.com",
        authorization_endpoint: "https://idp.example.com/authorize",
        token_endpoint: "https://idp.example.com/token",
        userinfo_endpoint: "https://idp.example.com/userinfo",
        jwks_uri: "https://idp.example.com/jwks.json",
        check_session_iframe: "https://idp.example.com/session",

        // Much tighter restrictions
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        token_endpoint_auth_methods_supported: [
          // "tls_client_auth",
          "private_key_jwt",
        ],
        pushed_authorization_request_endpoint: "https://idp.example.com/par",
        require_pushed_authorization_requests: true,
      });
    });
  });
});
