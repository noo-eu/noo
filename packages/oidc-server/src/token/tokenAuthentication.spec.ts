import * as jose from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import type { Client } from "../configuration";
import configuration from "../configuration";
import { authenticateClient } from "./tokenAuthentication";

const BASE_URL = configuration.baseUrl;

const createBaseClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "oidc_1",
    clientSecret: "s3cr3tValue",
    tokenEndpointAuthMethod: "client_secret_basic",
    issuer: BASE_URL,
    redirectUris: ["https://client.app/cb"],
    idTokenSignedResponseAlg: "RS256",
    subjectType: "public",
    ...overrides,
  }) as Client;

// Precompute auth values
const testClientInfo = {
  clientId: "oidc_1",
  clientSecret: "s3cr3tValue",
};
const basicHeader = `Basic ${btoa(`${testClientInfo.clientId}:${testClientInfo.clientSecret}`)}`;
const postData = `client_id=${testClientInfo.clientId}&client_secret=${testClientInfo.clientSecret}`;

describe("authenticateClient", () => {
  describe("for 'client_secret_basic' method", () => {
    const client = createBaseClient({
      tokenEndpointAuthMethod: "client_secret_basic",
    });

    it("returns true if Authorization header is correct", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        headers: { Authorization: basicHeader },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(true);
    });

    it("returns false if Authorization header is missing", async () => {
      const request = new Request(`${BASE_URL}/token`);
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if Authorization header has wrong scheme", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        headers: { Authorization: `Bearer some_token` }, // Wrong scheme
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if Authorization header has incorrect credentials", async () => {
      const wrongHeader = `Basic ${btoa(`${testClientInfo.clientId}:wrong-secret`)}`;
      const request = new Request(`${BASE_URL}/token`, {
        headers: { Authorization: wrongHeader },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if Authorization header is malformed", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        headers: { Authorization: "Basic malformed!!!" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client tries to auth via POST body", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: postData,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });
  });

  describe("for 'client_secret_post' method", () => {
    const client = createBaseClient({
      tokenEndpointAuthMethod: "client_secret_post",
    });

    it("returns true if POST body credentials are correct", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: postData,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(true);
    });

    it("returns false if client_id is missing from body", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: `client_secret=${testClientInfo.clientSecret}`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_secret is missing from body", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: `client_id=${testClientInfo.clientId}`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_secret is incorrect in body", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: `client_id=${testClientInfo.clientId}&client_secret=wrong-secret`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_id does not match client object", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: `client_id=other_client&client_secret=${testClientInfo.clientSecret}`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if Content-Type is incorrect", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: postData,
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Wrong type
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if method is not POST", async () => {
      const request = new Request(`${BASE_URL}/token?${postData}`, {
        // Try sending in query
        method: "GET",
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client tries to auth via Basic header", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        headers: { Authorization: basicHeader },
        method: "POST", // Needs to be POST for token endpoint usually
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });
  });

  describe("for 'client_secret_jwt' method", () => {
    const client = createBaseClient({
      tokenEndpointAuthMethod: "client_secret_jwt",
    });
    const expectedAudience = `${BASE_URL}/token`; // Audience should be the token endpoint URL
    let validJwt: string;
    let jwtWithWrongAudience: string;
    let jwtWithBadSignature: string;
    let expiredJwt: string;

    beforeAll(async () => {
      const secretBuffer = Buffer.from(testClientInfo.clientSecret);
      const createTestJwt = (
        payloadOverrides = {},
        signWithSecret = secretBuffer,
      ) =>
        new jose.SignJWT({
          exp: Math.floor(Date.now() / 1000) + 600,
          aud: expectedAudience,
          ...payloadOverrides,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuer(testClientInfo.clientId)
          .setSubject(testClientInfo.clientId)
          .setJti(Math.random().toString(36).substring(2))
          .setIssuedAt()
          .sign(signWithSecret);

      validJwt = await createTestJwt();
      jwtWithWrongAudience = await createTestJwt({
        aud: `${BASE_URL}/userinfo`,
      });
      jwtWithBadSignature = await createTestJwt(
        {},
        Buffer.from("different_secret"),
      );
      expiredJwt = await createTestJwt({
        exp: Math.floor(Date.now() / 1000) - 300,
      });
    });

    const createJwtRequest = (
      assertion: string,
      type:
        | string
        | null = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    ) => {
      const bodyParams = new URLSearchParams();
      if (type !== null) {
        // Allow explicitly omitting type
        bodyParams.set("client_assertion_type", type);
      }
      bodyParams.set("client_assertion", assertion);

      return new Request(`${BASE_URL}/token`, {
        body: bodyParams.toString(),
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    };

    it("returns true for a valid client_assertion JWT", async () => {
      const request = createJwtRequest(validJwt);
      await expect(authenticateClient(request, client)).resolves.toBe(true);
    });

    it("returns false if client_assertion JWT has wrong signature", async () => {
      const request = createJwtRequest(jwtWithBadSignature);
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_assertion JWT has wrong audience", async () => {
      const request = createJwtRequest(jwtWithWrongAudience);
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_assertion JWT is expired", async () => {
      const request = createJwtRequest(expiredJwt);
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_assertion_type is wrong", async () => {
      const request = createJwtRequest(validJwt, "urn:example:wrong:type");
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_assertion_type is missing", async () => {
      const request = createJwtRequest(validJwt, null); // Omit type
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if client_assertion is missing", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        body: "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer", // Type but no assertion
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });

    it("returns false if assertion is not a valid JWT format", async () => {
      const request = createJwtRequest("this.is.not.a.jwt");
      await expect(authenticateClient(request, client)).resolves.toBe(false);
    });
  });

  describe("for 'private_key_jwt' method", () => {
    const client = createBaseClient({
      tokenEndpointAuthMethod: "private_key_jwt",
    });

    it("rejects with an error (Not Implemented)", async () => {
      const request = new Request(`${BASE_URL}/token`);
      // Check if it throws or returns false based on implementation detail
      // Assuming it throws based on original test:
      await expect(authenticateClient(request, client)).rejects.toThrow(
        /not implemented|private_key_jwt/i,
      );
      // If it returns false:
      // await expect(authenticateClient(request, client)).resolves.toBe(false);
    });
  });

  describe("for 'none' method (public client)", () => {
    const client = createBaseClient({
      tokenEndpointAuthMethod: "none",
      clientSecret: undefined,
    }); // Public client has no secret

    it("returns true without checking credentials", async () => {
      const request = new Request(`${BASE_URL}/token`); // No auth info needed
      await expect(authenticateClient(request, client)).resolves.toBe(true);
    });

    it("returns true even if auth info is provided (it should be ignored)", async () => {
      const request = new Request(`${BASE_URL}/token`, {
        headers: { Authorization: basicHeader }, // Provide basic auth header
      });
      await expect(authenticateClient(request, client)).resolves.toBe(true); // Should still succeed
    });
  });

  describe("for other unsupported auth methods", () => {
    const client = createBaseClient({
      tokenEndpointAuthMethod: "unsupported_method" as any,
    }); // Cast to allow unsupported value

    it("rejects with an error", async () => {
      const request = new Request(`${BASE_URL}/token`);
      await expect(authenticateClient(request, client)).rejects.toThrow(
        /Unsupported.*method/i,
      );
      // Or returns false depending on implementation
      // await expect(authenticateClient(request, client)).resolves.toBe(false);
    });
  });
});
