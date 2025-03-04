import { expect, test } from "@playwright/test";

test.describe("Public provider", () => {
  test.describe("OpenID Configuration", () => {
    test("it responds with a valid OpenID Configuration", async ({
      request,
      baseURL,
    }) => {
      const response = await request.get(
        "/oidc/.well-known/openid-configuration",
      );

      // A successful response MUST use the 200 OK HTTP status code
      expect(response.status()).toBe(200);

      // and return a JSON object using the application/json content type
      expect(response.headers()["content-type"]).toMatch(
        /^application\/json\b/,
      );

      // Issuer is required to be an https URL
      expect(baseURL).toEqual(expect.stringMatching(/^https?:\/\/[^/]+$/));

      const config = await response.json();

      // Check for REQUIRED fields
      expect(config).toMatchObject({
        issuer: expect.stringMatching(baseURL!),
        authorization_endpoint: expect.stringMatching(baseURL!),
        token_endpoint: expect.stringMatching(baseURL!),
        userinfo_endpoint: expect.stringMatching(baseURL!),
        jwks_uri: expect.stringMatching(baseURL!),
        response_types_supported: expect.arrayContaining([
          "code",
          "id_token",
          "id_token token",
        ]),
        subject_types_supported: expect.any(Array),
        id_token_signing_alg_values_supported: expect.arrayContaining([
          "RS256",
        ]),
      });

      // Check for RECOMMENDED (supported) fields
      expect(config).toMatchObject({
        scopes_supported: expect.arrayContaining([
          "openid",
          "profile",
          "email",
        ]),
        claims_supported: expect.arrayContaining(["sub"]),
      });

      // Check that the registration_endpoint is not present
      expect(config).not.toHaveProperty("registration_endpoint");

      // Claims with zero elements MUST be omitted from the response.
      for (const key in config) {
        if (Array.isArray(config[key])) {
          expect(config[key]).not.toHaveLength(0);
        }
      }
    });
  });
});

test.describe("Private provider", () => {
  test.describe("OpenID Configuration", () => {
    test("it responds with a valid OpenID Configuration", async ({
      request,
      baseURL,
    }) => {
      const response = await request.get(
        "/oidc/acme.fr/.well-known/openid-configuration",
      );

      // A successful response MUST use the 200 OK HTTP status code
      expect(response.status()).toBe(200);

      const config = await response.json();
      expect(config).toMatchObject({
        issuer: `${baseURL}/oidc/acme.fr`,
        registration_endpoint: `${baseURL}/oidc/acme.fr/register`,
      });

      // It responds with 404 if the domain is not registered
      const response404 = await request.get(
        "/oidc/microsoft.com/.well-known/openid-configuration",
      );
      expect(response404.status()).toBe(404);
    });
  });
});
