import { describe, test, expect } from "bun:test";
import {
  authenticateClientSecretBasic,
  authenticateClientSecretJwt,
  authenticateClientSecretPost,
} from "./tokenAuthentication";
import { HttpRequest } from "@/lib/http/request";
import OidcClients from "@/db/oidc_clients";
import * as jose from "jose";

const client = await OidcClients.find("00000000-0000-0000-0000-000000000001");
const basicHeader = "Basic " + btoa(`${client!.id}:${client!.clientSecret}`);
const postData =
  "client_id=" + client!.id + "&client_secret=" + client!.clientSecret;

describe("authenticateClientSecretBasic", async () => {
  test("returns true if the client is authenticated", async () => {
    const rawRequest = new Request("https://example.com", {
      headers: {
        Authorization: basicHeader,
      },
    });

    expect(
      authenticateClientSecretBasic(new HttpRequest(rawRequest), client!),
    ).toBe(true);
  });

  test("returns false if the client is not authenticated", async () => {
    const rawRequest = new Request("https://example.com", {
      headers: {
        Authorization: "Basic " + btoa(`${client!.id}:wrong-secret`),
      },
    });

    expect(
      authenticateClientSecretBasic(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });

  test("returns false if the client is not authenticated (bad auth header)", async () => {
    const rawRequest = new Request("https://example.com", {
      headers: {
        Authorization: "Bearer " + btoa(`${client!.id}:wrong-secret`),
      },
    });

    expect(
      authenticateClientSecretBasic(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });
});

describe("authenticateClientSecretPost", async () => {
  test("returns true if the client is authenticated", async () => {
    const rawRequest = new Request("https://example.com", {
      body: postData,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(
      await authenticateClientSecretPost(new HttpRequest(rawRequest), client!),
    ).toBe(true);
  });

  test("returns false if the client is not authenticated", async () => {
    const rawRequest = new Request("https://example.com", {
      body: "client_id=" + client!.id + "&client_secret=wrong-secret",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(
      await authenticateClientSecretPost(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });

  test("returns false if the client attempts to authenticate using Basic auth", async () => {
    const rawRequest = new Request("https://example.com", {
      headers: {
        Authorization: basicHeader,
      },
    });

    expect(
      await authenticateClientSecretPost(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });
});

describe("authenticateClientSecretJwt", async () => {
  const validJwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(client!.id)
    .setSubject(client!.id)
    .setAudience("https://localhost:23000/oidc/token")
    .setJti("123")
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(Buffer.from(client!.clientSecret));

  const invalidJwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(client!.id)
    .setSubject(client!.id)
    .setAudience("https://localhost:23000") // Invalid audience
    .setJti("123")
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(Buffer.from(client!.clientSecret));

  const badSignature = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(client!.id)
    .setSubject(client!.id)
    .setAudience("https://localhost:23000") // Invalid audience
    .setJti("123")
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(Buffer.from("hello"));

  test("returns true if the client is authenticated", async () => {
    const rawRequest = new Request("https://example.com", {
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

    expect(
      await authenticateClientSecretJwt(new HttpRequest(rawRequest), client!),
    ).toBe(true);
  });

  test("returns false if the client is signed incorrectly", async () => {
    const rawRequest = new Request("https://example.com", {
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

    expect(
      await authenticateClientSecretJwt(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });

  test("returns false if the token has the wrong audience", async () => {
    const rawRequest = new Request("https://example.com", {
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

    expect(
      await authenticateClientSecretJwt(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });

  test("returns false if the client sends the wrong assertion_type", async () => {
    const rawRequest = new Request("https://example.com", {
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

    expect(
      await authenticateClientSecretJwt(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });

  test("returns false if the authentication is attempted on a GET request (can this even happen?)", async () => {
    const rawRequest = new Request("https://example.com");

    expect(
      await authenticateClientSecretJwt(new HttpRequest(rawRequest), client!),
    ).toBe(false);
  });
});
