import OidcAuthorizationCodes from "@/db/oidc_authorization_codes";
import { describe, expect, test } from "bun:test";
import { HttpRequest } from "../http/request";
import { tokenEndpoint } from "./token";

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
    new HttpRequest(
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
          typeof body === "string"
            ? body
            : new URLSearchParams(body).toString(),
      }),
    );

  test("requires a grant_type", async () => {
    const response = await tokenEndpoint(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "unsupported_grant_type" });
  });

  describe("grant_type=authorization_code", () => {
    const makeCode = async (attributes = {}) =>
      await OidcAuthorizationCodes.create({
        id: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
          "base64url",
        ),
        clientId: "00000000-0000-0000-0000-000000000001",
        redirectUri: "https://localhost:22999/cb",
        userId: "00000000-0000-0000-0000-000000000001",
        authTime: new Date(),
        nonce: "nonce",
        ...attributes,
      });

    const basicHeader =
      "Basic " +
      Buffer.from("00000000-0000-0000-0000-000000000001:super-s3cret").toString(
        "base64url",
      );

    test("requires a code", async () => {
      const response = await tokenEndpoint(
        makeRequest({ body: { grant_type: "authorization_code" } }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_request" });
    });

    test("requires a valid code", async () => {
      const response = await tokenEndpoint(
        makeRequest({
          body: { grant_type: "authorization_code", code: "invalid" },
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_grant" });
    });

    test("must authenticate the client (fail)", async () => {
      const code = await makeCode();
      const response = await tokenEndpoint(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
        }),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "forbidden" });
    });

    test("must authenticate the client", async () => {
      const code = await makeCode();
      const response = await tokenEndpoint(
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

      let response = await tokenEndpoint(
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

      response = await tokenEndpoint(
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
      const response = await tokenEndpoint(
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
      const response = await tokenEndpoint(
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

    test("the code is single use, and is deleted after being used", async () => {
      const code = await makeCode();
      const response = await tokenEndpoint(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);

      const response2 = await tokenEndpoint(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response2.status).toBe(400);
      expect(await response2.json()).toEqual({ error: "invalid_grant" });
    });

    test("the code expires in a short time", async () => {
      const code = await makeCode({
        // 5 minutes ago
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      });
      const response = await tokenEndpoint(
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
      const response = await tokenEndpoint(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      const idToken = body.id_token;

      const idTokenParts = idToken.split(".");
      expect(idTokenParts).toHaveLength(3);
      const payload = JSON.parse(atob(idTokenParts[1]));

      expect(payload).toMatchObject({
        iss: "https://localhost:23000/oidc",
        sub: expect.stringContaining("usr_"),
        aud: "00000000-0000-0000-0000-000000000001",
        exp: expect.any(Number),
        iat: expect.any(Number),
        auth_time: expect.any(Number),
        nonce: code.nonce,
      });
    });

    test("returns the claims requested in the id_token", async () => {
      const code = await makeCode({
        claims: JSON.stringify({
          id_token: {
            given_name: null,
          },
          userinfo: {
            family_name: null,
          },
        }),
      });

      const response = await tokenEndpoint(
        makeRequest({
          body: { grant_type: "authorization_code", code: code.id },
          headers: { Authorization: basicHeader },
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      const idToken = body.id_token;

      const idTokenParts = idToken.split(".");
      expect(idTokenParts).toHaveLength(3);
      const payload = JSON.parse(atob(idTokenParts[1]));

      expect(payload.given_name).toBe("John");
      expect(Object.keys(payload)).not.toContain("family_name");
    });
  });

  test("sets CORS headers", async () => {
    const request = new Request("https://localhost:23000/oidc/token", {
      method: "OPTIONS",
      headers: {
        "Access-Control-Request-Method": "POST",
        Origin: "https://example.com",
      },
    });

    const response = await tokenEndpoint(new HttpRequest(request));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://example.com",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  test("sets cache headers", async () => {
    const request = new Request("https://localhost:23000/oidc/token", {
      method: "POST",
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "bad=1",
    });

    const response = await tokenEndpoint(new HttpRequest(request));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
