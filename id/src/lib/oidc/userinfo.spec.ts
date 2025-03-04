import OidcAccessTokens from "@/db/oidc_access_tokens";
import { uuidToHumanId } from "@/utils";
import { describe, expect, test } from "bun:test";
import { HttpRequest } from "../http/request";
import { userinfoEndpoint } from "./userinfo";

describe("Userinfo endpoint", () => {
  const makeRequest = ({
    body,
    headers,
  }: {
    body?: string | Record<string, string>;
    headers?: Record<string, string>;
  } = {}) =>
    new HttpRequest(
      new Request("https://localhost:23000/oidc/userinfo", {
        method: "POST",
        headers: {
          "X-Forwarded-Proto": "https",
          Host: "localhost:23000",
          Origin: "https://example.com",
          ...headers,
        },
        body:
          typeof body === "string"
            ? body
            : new URLSearchParams(body).toString(),
      }),
    );

  const makeAccessToken = async (attributes = {}) =>
    await OidcAccessTokens.create({
      clientId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000001",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      ...attributes,
    });

  test("requires an access token as a Bearer token", async () => {
    const response = await userinfoEndpoint(makeRequest());
    expect(response.status).toBe(401);
  });

  test("the access token must be valid", async () => {
    const response = await userinfoEndpoint(
      makeRequest({
        headers: { Authorization: "Bearer invalid" },
      }),
    );

    expect(response.status).toBe(401);
  });

  test("it works when the AT is valid", async () => {
    const at = await makeAccessToken();

    const response = await userinfoEndpoint(
      makeRequest({
        headers: { Authorization: "Bearer " + uuidToHumanId(at.id, "oidc_at") },
      }),
    );

    expect(response.status).toBe(200);
  });

  test("it works when the AT is passed as a form parameter", async () => {
    const at = await makeAccessToken();

    const response = await userinfoEndpoint(
      makeRequest({
        body: { access_token: uuidToHumanId(at.id, "oidc_at") },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    expect(response.status).toBe(200);
  });

  test("respects access token expiration", async () => {
    const at = await makeAccessToken({
      // 5 minutes ago
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    const response = await userinfoEndpoint(
      makeRequest({
        headers: { Authorization: "Bearer " + uuidToHumanId(at.id, "oidc_at") },
      }),
    );

    expect(response.status).toBe(401);
  });

  test("it returns claims about the user", async () => {
    const at = await makeAccessToken();
    const response = await userinfoEndpoint(
      makeRequest({
        headers: { Authorization: "Bearer " + uuidToHumanId(at.id, "oidc_at") },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      iss: "https://localhost:23000/oidc",
      sub: expect.stringContaining("usr_"),
      aud: uuidToHumanId("00000000-0000-0000-0000-000000000001", "oidc"),
      exp: expect.any(Number),
      iat: expect.any(Number),
      nonce: at.nonce,
    });
  });

  test("returns the claims requested in the id_token", async () => {
    const at = await makeAccessToken({
      claims: JSON.stringify({
        id_token: {
          given_name: null,
        },
        userinfo: {
          family_name: null,
        },
      }),
    });

    const response = await userinfoEndpoint(
      makeRequest({
        headers: { Authorization: "Bearer " + uuidToHumanId(at.id, "oidc_at") },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      family_name: "Doe",
    });

    expect(Object.keys(body)).not.toContain("given_name");
  });

  test("sets CORS headers", async () => {
    const request = new Request("https://localhost:23000/oidc/userinfo", {
      method: "OPTIONS",
      headers: {
        "Access-Control-Request-Method": "POST",
        Origin: "https://example.com",
      },
    });

    const response = await userinfoEndpoint(new HttpRequest(request));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://example.com",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  test("sets cache headers", async () => {
    const request = new Request("https://localhost:23000/oidc/userinfo", {
      method: "GET",
      headers: {
        Origin: "https://example.com",
      },
    });

    const response = await userinfoEndpoint(new HttpRequest(request));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
