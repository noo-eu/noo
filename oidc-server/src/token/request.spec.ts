import { describe, expect, Mock, test } from "vitest";
import { handleTokenRequest } from "./request";
import { randomBytes } from "node:crypto";
import configuration, { AuthorizationCode, Client } from "@/configuration";
import { setAuthorizationCodes } from "../../vitest-setup";

const codeId = "oidc_code_" + randomBytes(32).toString("base64url");
const makeCode = async (attributes = {}) => {
  const code = {
    id: codeId,
    redirectUri: "https://localhost:22999/cb",
    userId: "usr_1",
    authTime: new Date(),
    createdAt: new Date(),
    nonce: "nonce",
    scopes: ["openid"],
    claims: {},
    codeChallenge: "",
    codeChallengeMethod: "",
    ...attributes,
  } as AuthorizationCode;

  setAuthorizationCodes({
    [codeId]: {
      code,
      client: {
        issuer: configuration.baseUrl,
        clientId: "oidc_1",
        clientSecret: "super-s3cret",
        tokenEndpointAuthMethod: "client_secret_basic",
        redirectUris: ["https://example.com/cb"],
        idTokenSignedResponseAlg: "RS256",
      } as Client,
    },
  });

  return code;
};

describe("Token endpoint", () => {
  const makeRequest = (
    {
      body,
      headers,
    }: {
      body: string | Record<string, string>;
      headers?: Record<string, string>;
    } = { body: {} },
  ) =>
    new Request("https://localhost:23000/oidc/token", {
      method: "POST",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Forwarded-Proto": "https",
        Host: "localhost:23000",
        ...headers,
      },
      body:
        typeof body === "string" ? body : new URLSearchParams(body).toString(),
    });

  test("requires a grant_type", async () => {
    const response = await handleTokenRequest(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
  });

  describe("grant_type=authorization_code", () => {
    const basicHeader =
      "Basic " + Buffer.from(`oidc_1:super-s3cret`).toString("base64url");

    test("requires a code", async () => {
      const response = await handleTokenRequest(
        makeRequest({ body: { grant_type: "authorization_code" } }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_request" });
    });

    test("requires a valid code", async () => {
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: "invalid" },
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_grant" });
    });

    test("must authenticate the client (fail)", async () => {
      const code = await makeCode();
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
        }),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "forbidden" });
    });

    test("must authenticate the client", async () => {
      const code = await makeCode();
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        access_token: expect.any(String),
        token_type: "Bearer",
        expires_in: 3600,
        id_token: expect.any(String),
      });
    });

    test("when passing a redirect_uri it must match the one in the auth request", async () => {
      const code = await makeCode();

      let response = await handleTokenRequest(
        makeRequest({
          body: {
            grant_type: "authorization_code",
            code: code.id,
            redirect_uri: "https://localhost:23000/cb",
          },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_grant" });

      response = await handleTokenRequest(
        makeRequest({
          body: {
            grant_type: "authorization_code",
            code: code.id,
            redirect_uri: code.redirectUri!,
          },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
    });

    test("when the authorization request had a code_challenge, the token request must have a code_verifier", async () => {
      const code = await makeCode({
        codeChallenge: "codeChallenge",
        codeChallengeMethod: "S256",
      });
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_request" });
    });

    test("when the authorization request had a code_challenge, the token request must pass the PKCE validation", async () => {
      const code = await makeCode({
        codeChallenge: "k2oYXKqiZrucvpgengXLeM1zKwsygOuURBK7b4-PB68",
        codeChallengeMethod: "S256",
      });
      const response = await handleTokenRequest(
        makeRequest({
          body: {
            grant_type: "authorization_code",
            code: code.id,
            code_verifier: "helloworld",
          },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
    });

    test("the code is single use, and is revoked after being used", async () => {
      const code = await makeCode();
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      expect(configuration.revokeCode as Mock).toHaveBeenCalled();
    });

    test("the code expires in a short time", async () => {
      const code = await makeCode({
        // 5 minutes ago
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      });
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_grant" });
    });

    test("it returns a valid id_token", async () => {
      const code = await makeCode();
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { id_token: string };
      const idToken = body.id_token;

      const idTokenParts = idToken.split(".");
      expect(idTokenParts).toHaveLength(3);
      const payload = JSON.parse(atob(idTokenParts[1]));

      expect(payload).toMatchObject({
        iss: configuration.baseUrl,
        sub: expect.any(String),
        aud: "oidc_1",
        exp: expect.any(Number),
        iat: expect.any(Number),
        auth_time: expect.any(Number),
        nonce: code.nonce,
      });
    });

    test("returns the claims requested in the id_token", async () => {
      const code = await makeCode({
        claims: {
          id_token: {
            given_name: null,
          },
          userinfo: {
            family_name: null,
          },
        },
      });

      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { id_token: string };
      const idToken = body.id_token;

      const idTokenParts = idToken.split(".");
      expect(idTokenParts).toHaveLength(3);
      const payload = JSON.parse(atob(idTokenParts[1]));

      expect(payload.given_name).toBe("John");
      expect(Object.keys(payload)).not.toContain("family_name");
    });

    test("when the code doesn't have the openid scope, it doesn't return an id_token", async () => {
      const code = await makeCode({ scopes: ["email"] });
      const response = await handleTokenRequest(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).not.toHaveProperty("id_token");

      // An access token is still returned
      expect(body).toMatchObject({
        access_token: expect.any(String),
        token_type: "Bearer",
        expires_in: 3600,
      });
    });
  });
});
