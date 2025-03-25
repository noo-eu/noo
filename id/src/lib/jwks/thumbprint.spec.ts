import { describe, expect, it } from "vitest";
import { computeJwkThumbprint } from "./thumbprint";

describe("computeJwkThumbprint", () => {
  it("generates correct thumbprint for RSA key", () => {
    const rsaJwk = {
      kty: "RSA",
      e: "AQAB",
      n: "sXchbMRaT4swZG_uBrdk0efOaLtSx", // truncated for brevity
    };

    const thumbprint = computeJwkThumbprint(rsaJwk);
    expect(thumbprint).toMatch(/^[A-Za-z0-9_-]{43}$/); // base64url SHA-256 is 43 chars
  });

  it("generates correct thumbprint for EC key", () => {
    const ecJwk = {
      kty: "EC",
      crv: "P-256",
      x: "f83OJ3D2xF4DA5J5omRRZL1vU6uH",
      y: "x_FEzRu9z5f6NdZXz8Xu9n3ZXbIV",
    };

    const thumbprint = computeJwkThumbprint(ecJwk);
    expect(thumbprint).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("generates correct thumbprint for OKP (Ed25519) key", () => {
    const okpJwk = {
      kty: "OKP",
      crv: "Ed25519",
      x: "11qYAYLef1EJc9p",
    };

    const thumbprint = computeJwkThumbprint(okpJwk);
    expect(thumbprint).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("throws error for unsupported key type", () => {
    const badJwk = {
      kty: "oct",
      k: "secret",
    };

    expect(() => computeJwkThumbprint(badJwk)).toThrowError(
      "Unsupported kty: oct",
    );
  });

  it("creates thumbprints with correct canonical ordering", () => {
    const jwk1 = {
      kty: "OKP",
      crv: "Ed25519",
      x: "abc123",
    };

    const jwk2 = {
      x: "abc123",
      crv: "Ed25519",
      kty: "OKP",
    };

    const thumb1 = computeJwkThumbprint(jwk1);
    const thumb2 = computeJwkThumbprint(jwk2);

    expect(thumb1).toBe(thumb2);
  });
});
