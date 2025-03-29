import { describe, expect, test } from "vitest";
import { handleUserinfo } from "./userinfo";
import configuration, { AccessToken, Client } from "./configuration";
import { setAccessTokens } from "../vitest-setup";

const makeAccessToken = async (attributes = {}) => {
  const at = {
    id: "at_001",
    userId: "usr_1",
    createdAt: new Date(),
    scopes: ["openid"],
    claims: {},
    ...attributes,
  } as AccessToken;

  setAccessTokens({
    [at.id]: {
      accessToken: at,
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

  return at;
};

describe("Userinfo endpoint", () => {
  const makeRequest = ({
    body,
    headers,
  }: {
    body?: string | Record<string, string>;
    headers?: Record<string, string>;
  } = {}) =>
    new Request("https://idp.example.com/userinfo", {
      method: "POST",
      headers: {
        "X-Forwarded-Proto": "https",
        Host: "localhost:23000",
        Origin: "https://example.com",
        ...headers,
      },
      body:
        typeof body === "string" ? body : new URLSearchParams(body).toString(),
    });

  test("requires an access token as a Bearer token", async () => {
    const response = await handleUserinfo(makeRequest());
    expect(response.status).toBe(401);
  });

  test("the access token must be valid", async () => {
    const response = await handleUserinfo(
      makeRequest({
        headers: { Authorization: "Bearer invalid" },
      }),
    );

    expect(response.status).toBe(401);
  });

  test("it works when the AT is valid", async () => {
    const at = await makeAccessToken();

    const response = await handleUserinfo(
      makeRequest({
        headers: { Authorization: "Bearer " + at.id },
      }),
    );

    expect(response.status).toBe(200);
  });

  test("it works when the AT is passed as a form parameter", async () => {
    const at = await makeAccessToken();

    const response = await handleUserinfo(
      makeRequest({
        body: { access_token: at.id },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    expect(response.status).toBe(200);
  });

  test("requires the access token to have the openid scope (otherwise it's an OAuth access token)", async () => {
    const at = await makeAccessToken({
      scopes: ["email"],
    });

    const response = await handleUserinfo(
      makeRequest({
        headers: { Authorization: "Bearer " + at.id },
      }),
    );

    expect(response.status).toBe(403);
  });

  test("it returns claims about the user", async () => {
    const at = await makeAccessToken();
    const response = await handleUserinfo(
      makeRequest({
        headers: { Authorization: "Bearer " + at.id },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      iss: "https://idp.example.com",
      sub: expect.any(String),
      aud: "oidc_1",
      exp: expect.any(Number),
      iat: expect.any(Number),
    });
  });

  test("returns the claims requested in userinfo", async () => {
    const at = await makeAccessToken({
      claims: {
        id_token: {
          given_name: null,
        },
        userinfo: {
          family_name: null,
        },
      },
    });

    const response = await handleUserinfo(
      makeRequest({
        headers: { Authorization: "Bearer " + at.id },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      family_name: "Doe",
    });

    expect(Object.keys(body)).not.toContain("given_name");
  });

  describe("when the userinfo signing algorithm is set", async () => {
    test("returns the claims requested in userinfo as a JWT", async () => {
      // TODO
    });
  });
});
