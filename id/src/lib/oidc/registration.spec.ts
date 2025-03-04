import { describe, expect, test } from "bun:test";

import db from "@/db";
import { oidcClientRegistration, validateRedirectUris } from "./registration";

describe("OIDC Client Registration", async () => {
  const tenant = (await db.query.tenants.findFirst())!;

  const perform = async (request: Record<string, unknown>) => {
    const response = await oidcClientRegistration(request, tenant);
    return await response.json();
  };

  test("it requires redirect_uris", async () => {
    const result = await perform({});
    expect(result).toMatchObject({
      error: "invalid_redirect_uri",
      error_description: expect.any(String),
    });
  });

  test("it works with just redirect_uris", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
    });

    expect(result).toMatchObject({
      client_id: expect.any(String),
      client_secret: expect.any(String),
      redirect_uris: ["https://example.com/callback"],
    });
  });

  test("it refuses to handle too many redirect_uris", async () => {
    const result = await perform({
      redirect_uris: Array(20).fill("https://example.com/callback"),
    });

    expect(result).toMatchObject({
      error: "invalid_redirect_uri",
      error_description: expect.any(String),
    });
  });

  test("it refuses to redirect_uris with query string or fragments", async () => {
    const result = await perform({
      redirect_uris: Array(20).fill(
        "https://example.com/callback?query=string",
      ),
    });

    expect(result).toMatchObject({
      error: "invalid_redirect_uri",
      error_description: expect.any(String),
    });

    const result2 = await perform({
      redirect_uris: Array(20).fill("https://example.com/callback#fragment"),
    });

    expect(result2).toMatchObject({
      error: "invalid_redirect_uri",
      error_description: expect.any(String),
    });
  });

  test("it rejects application_types other than web or native", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      application_type: "spa",
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });
  });

  test("native clients have specific redirect_uri requirements", async () => {
    const acceptedNativeRedirectUris = [
      "http://localhost",
      "http://localhost:1234",
      "http://127.0.0.1:3000",
      "http://[::1]:9999/test/callback",
      "myapp://callback",
      "myapp://callback/with/path",
    ];

    // undefined is returned when the validation passes
    for (const uri of acceptedNativeRedirectUris) {
      expect(validateRedirectUris([uri], "native")).toBeUndefined();
    }

    const rejectedNativeRedirectUris = [
      "https://example.com/callback",
      "http://example.com/callback",
      "https://localhost:1234",
    ];

    for (const uri of rejectedNativeRedirectUris) {
      expect(validateRedirectUris([uri], "native")).toBeDefined();
    }
  });

  test("it can handle localised fields", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      client_name: "My app",
      "client_name#fr": "Mon app",
    });

    expect(result).toMatchObject({
      client_id: expect.any(String),
      client_secret: expect.any(String),
      redirect_uris: ["https://example.com/callback"],
      client_name: "My app",
      "client_name#fr": "Mon app",
    });
  });

  test("it ensures that a valid response_type is given", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      response_types: ["coken"],
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });

    const result2 = await perform({
      redirect_uris: ["https://example.com/callback"],
      response_types: ["coken", "code"],
    });

    expect(result2).toMatchObject({
      client_id: expect.any(String),
    });
  });

  test("it fills grant_types depending on response_types", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      response_types: ["id_token token"],
      grant_types: [], // Prevent the default "authorization_code" grant type by setting an empty array
    });

    expect(result).toMatchObject({
      client_id: expect.any(String),
      grant_types: ["implicit"],
    });

    const result2 = await perform({
      redirect_uris: ["https://example.com/callback"],
      response_types: ["code", "id_token token"],
      grant_types: [], // Prevent
    });

    expect(result2).toMatchObject({
      client_id: expect.any(String),
      grant_types: ["authorization_code", "implicit"],
    });
  });

  test("it checks that contacts are email addresses, and no more than 5", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      contacts: ["not-an-email"],
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });

    const result2 = await perform({
      redirect_uris: ["https://example.com/callback"],
      contacts: Array(6).fill("test@example.com"),
    });

    expect(result2).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });

    const result3 = await perform({
      redirect_uris: ["https://example.com/callback"],
      contacts: ["good-one@noo.eu"],
    });

    expect(result3).toMatchObject({
      client_id: expect.any(String),
    });
  });

  test("it checks that jwks and jwks_uri are not both present", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      jwks: { keys: [] },
      jwks_uri: "https://example.com/jwks",
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });

    const result2 = await perform({
      redirect_uris: ["https://example.com/callback"],
      jwks_uri: "https://example.com/jwks",
    });

    expect(result2).toMatchObject({
      client_id: expect.any(String),
    });
  });

  test("it checks that the jwks_uri is an HTTPS url", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      jwks_uri: "http://example.com/jwks",
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });
  });

  test("it makes sure that jwks is a valid JSON Web Key Set", async () => {
    const invalid = [
      {},
      { keys: [{}] },
      { keys: [{ kty: "RSA" }] },
      { keys: [{ kty: "RSA", x: "asd" }] },
      { keys: [{ kty: "RSA", x: "asd", y: "asd" }] },
      { keys: [{ kty: "EC", crv: "P-256" }] },
      { keys: [{ kty: "EC", n: "abc" }] },
      { keys: [{ kty: "OKP", crv: "P-256", x: "abc" }] },
    ];

    const valid = [
      { keys: [{ kty: "RSA", e: "AQAB", n: "abc" }] }, // `kid` is optional
      { keys: [{ kid: "123", kty: "RSA", e: "AQAB", n: "abc" }] },
      { keys: [{ kid: "123", kty: "EC", crv: "P-256", x: "abc", y: "abc" }] },
      { keys: [{ kid: "123", kty: "OKP", crv: "Ed25519", x: "abc" }] },
    ];

    for (const jwks of invalid) {
      const result = await perform({
        redirect_uris: ["https://example.com/bad"],
        jwks,
      });

      expect(result).toMatchObject({
        error: "invalid_client_metadata",
        error_description: expect.any(String),
      });
    }

    for (const jwks of valid) {
      const result = await perform({
        redirect_uris: ["https://example.com/good"],
        jwks,
      });

      expect(result).toMatchObject({
        client_id: expect.any(String),
      });
    }
  });

  describe("sector_identifier_uri", async () => {
    test("it requires sector_identifier_uri to be an HTTPS url", async () => {
      const result = await perform({
        redirect_uris: ["https://example.com/callback"],
        sector_identifier_uri: "http://example.com/sector",
      });

      expect(result).toMatchObject({
        error: "invalid_client_metadata",
        error_description: expect.any(String),
      });
    });

    // TODO: more sector_identifier_uri tests, involves mocking the HTTP request
  });

  test("it uses pairwise subject identifier when it's set to some random value", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      subject_type: "I'm a random value",
    });

    expect(result).toMatchObject({
      client_id: expect.any(String),
      subject_type: "pairwise",
    });
  });

  test("id_token_signed_response_alg can only be set to none if response_types is ['code']", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      id_token_signed_response_alg: "none",
      response_types: ["id_token"],
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });

    const result2 = await perform({
      redirect_uris: ["https://example.com/callback"],
      id_token_signed_response_alg: "none",
      // response_types: ["code"] is the default
    });

    expect(result2).toMatchObject({
      client_id: expect.any(String),
    });
  });

  test("signature algorithms must be supported", async () => {
    const fields = [
      "id_token_signed_response_alg",
      "userinfo_signed_response_alg",
      "request_object_signing_alg",
      "token_endpoint_auth_signing_alg",
    ];

    for (const field of fields) {
      const result = await perform({
        redirect_uris: ["https://example.com/callback"],
        [field]: "RS512",
      });

      expect(result).toMatchObject({
        error: "invalid_client_metadata",
        error_description: expect.any(String),
      });
    }
  });

  test("encryption is not supported", async () => {
    const fields = [
      "id_token_encrypted_response_alg",
      "id_token_encrypted_response_enc",
      "userinfo_encrypted_response_alg",
      "userinfo_encrypted_response_enc",
      "request_object_encryption_alg",
      "request_object_encryption_enc",
    ];

    for (const field of fields) {
      const result = await perform({
        redirect_uris: ["https://example.com/callback"],
        [field]: "RSA-OAEP",
      });

      expect(result).toMatchObject({
        error: "invalid_client_metadata",
        error_description: expect.any(String),
      });
    }
  });

  test("token_endpoint_auth_method must be a supported method", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      token_endpoint_auth_method: "password",
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });
  });

  test("default_max_age must be >= 0", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      default_max_age: -1,
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });
  });

  test("initiate_login_uri must be an HTTPS url", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      initiate_login_uri: "http://example.com/initiate",
    });

    expect(result).toMatchObject({
      error: "invalid_client_metadata",
      error_description: expect.any(String),
    });
  });

  test("deafult_acr_values is cleaned to supported strings", async () => {
    const result = await perform({
      redirect_uris: ["https://example.com/callback"],
      default_acr_values: ["simple", "unicorn"],
    });

    expect(result).toMatchObject({
      client_id: expect.any(String),
      default_acr_values: ["simple"],
    });
  });
});
