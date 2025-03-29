import { describe, expect, test } from "vitest";
import * as jose from "jose";
import { authenticateClient } from "./tokenAuthentication";
import { Client } from "@/configuration";

const baseClient = {
  clientId: "oidc_1",
  clientSecret: "123",
} as Client;

const basicHeader =
  "Basic " + btoa(`${baseClient.clientId}:${baseClient.clientSecret}`);
const postData =
  "client_id=" +
  baseClient.clientId +
  "&client_secret=" +
  baseClient.clientSecret;

const makeClient = (args: Partial<Client>): Client => {
  return {
    ...baseClient,
    ...args,
  } as Client;
};

describe("ClientSecretBasic", async () => {
  const client = makeClient({
    tokenEndpointAuthMethod: "client_secret_basic",
  });

  test("returns true if the client is authenticated", async () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: basicHeader,
      },
    });

    expect(await authenticateClient(request, client)).toBe(true);
  });

  test("returns false if the authorization header is missing", async () => {
    const request = new Request("https://example.com");

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client is not authenticated", async () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: "Basic " + btoa(`${baseClient.clientId}:wrong-secret`),
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client is not authenticated (bad auth header)", async () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: "Bearer " + btoa(`${baseClient.clientId}:wrong-secret`),
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });
});

describe("ClientSecretPost", async () => {
  const client = makeClient({
    tokenEndpointAuthMethod: "client_secret_post",
  });

  test("returns true if the client is authenticated", async () => {
    const request = new Request("https://example.com", {
      body: postData,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(await authenticateClient(request, client)).toBe(true);
  });

  test("returns false if the client is not authenticated", async () => {
    const request = new Request("https://example.com", {
      body: "client_id=" + baseClient.clientId + "&client_secret=wrong-secret",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client_id is missing", async () => {
    const request = new Request("https://example.com", {
      body: "client_secret=" + baseClient.clientSecret,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client_secret is missing", async () => {
    const request = new Request("https://example.com", {
      body: "client_id=" + baseClient.clientId,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client attempts to authenticate using Basic auth", async () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: basicHeader,
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });
});

describe("ClientSecretJwt", async () => {
  const client = makeClient({
    tokenEndpointAuthMethod: "client_secret_jwt",
  });

  const validJwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(baseClient.clientId)
    .setSubject(baseClient.clientId)
    .setAudience("https://idp.example.com/token")
    .setJti("123")
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(Buffer.from(baseClient.clientSecret));

  const invalidJwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(baseClient.clientId)
    .setSubject(baseClient.clientId)
    .setAudience("https://idp.example.com") // Invalid audience
    .setJti("123")
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(Buffer.from(baseClient.clientSecret));

  const badSignature = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(baseClient.clientId)
    .setSubject(baseClient.clientId)
    .setAudience("https://idp.example.com") // Invalid audience
    .setJti("123")
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(Buffer.from("hello"));

  test("returns true if the client is authenticated", async () => {
    const request = new Request("https://example.com", {
      body:
        "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=" +
        validJwt,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "localhost:23000",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(await authenticateClient(request, client)).toBe(true);
  });

  test("returns false if the client is signed incorrectly", async () => {
    const request = new Request("https://example.com", {
      body:
        "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=" +
        badSignature,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "localhost:23000",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the token has the wrong audience", async () => {
    const request = new Request("https://example.com", {
      body:
        "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=" +
        invalidJwt,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "localhost:23000",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client sends the wrong assertion_type", async () => {
    const request = new Request("https://example.com", {
      body:
        "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:wrong-type&client_assertion=" +
        validJwt,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "localhost:23000",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the authentication is attempted on a GET request (can this even happen?)", async () => {
    const request = new Request("https://example.com");

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client_assertion_type is missing", async () => {
    const request = new Request("https://example.com", {
      body: "client_assertion=" + validJwt,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "localhost:23000",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });

  test("returns false if the client_assertion is missing", async () => {
    const request = new Request("https://example.com", {
      body: "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Host: "localhost:23000",
        "X-Forwarded-Proto": "https",
      },
    });

    expect(await authenticateClient(request, client)).toBe(false);
  });
});

describe("PrivateKeyJwt", async () => {
  const client = makeClient({
    tokenEndpointAuthMethod: "private_key_jwt",
  });

  test("it throws (not implemented)", async () => {
    const request = new Request("https://example.com");

    await expect(() => authenticateClient(request, client)).rejects.toThrow();
  });
});

describe("None", async () => {
  const client = makeClient({
    tokenEndpointAuthMethod: "none",
  });

  test("returns true", async () => {
    const request = new Request("https://example.com", {});

    expect(await authenticateClient(request, client)).toBe(true);
  });
});

describe("other unsupported auth method", async () => {
  const client = makeClient({
    tokenEndpointAuthMethod: "other",
  });

  test("throws an error", async () => {
    const request = new Request("https://example.com");

    await expect(() => authenticateClient(request, client)).rejects.toThrow();
  });
});
