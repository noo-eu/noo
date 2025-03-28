import { err, ok } from "neverthrow";
import { createIdToken, decodeIdToken, idTokenHash } from "./idToken";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { Client } from "./configuration";

const baseClient = {
  clientId: "client",
  issuer: "https://example.com",
  idTokenSignedResponseAlg: "RS256",
  subjectType: "public",
  redirectUris: ["https://example.com/cb"],
};

const roundTrip = async (
  client: Client,
  userId: string,
  claims: Record<string, unknown>,
) => {
  const idToken = await createIdToken(client, userId, claims);
  return await decodeIdToken(idToken, {
    alg: client.idTokenSignedResponseAlg,
  });
};

describe("createIdToken", async () => {
  describe("when the signing algorithm is none", async () => {
    const client = {
      ...baseClient,
      idTokenSignedResponseAlg: "none",
    };

    test("creates an unsigned ID Token", async () => {
      const userId = "usr_1";
      const claims = { name: "Jack" };

      const idToken = await createIdToken(client, userId, claims);
      const decoded = await decodeIdToken(idToken, {
        alg: "none",
      });

      expect(decoded).toEqual(
        ok({
          iss: client.issuer,
          aud: client.clientId,
          exp: expect.any(Number),
          iat: expect.any(Number),
          sub: "usr_1",
          name: "Jack",
        }),
      );
    });
  });

  describe("when the signing algorithm is RS256", async () => {
    const client = {
      ...baseClient,
      idTokenSignedResponseAlg: "RS256",
    };

    test("creates a signed ID Token", async () => {
      const userId = "usr_1";
      const claims = { name: "Jack" };

      const idToken = await createIdToken(client, userId, claims);
      const decoded = await decodeIdToken(idToken, {
        alg: "RS256",
      });

      expect(decoded).toEqual(
        ok({
          iss: client.issuer,
          aud: client.clientId,
          exp: expect.any(Number),
          iat: expect.any(Number),
          sub: "usr_1",
          name: "Jack",
        }),
      );
    });
  });

  describe("when the subject type is pairwise", async () => {
    const client = {
      ...baseClient,
      subjectType: "pairwise",
      idTokenSignedResponseAlg: "none",
    };

    test("it encodes the sub claim as a pairwise identifier", async () => {
      const userId = "usr_1";
      const claims = { name: "Jack" };

      const idToken = await createIdToken(client, userId, claims);
      const decoded = await decodeIdToken(idToken, {
        alg: "none",
      });

      expect(decoded).toEqual(
        ok({
          iss: client.issuer,
          aud: client.clientId,
          exp: expect.any(Number),
          iat: expect.any(Number),
          sub: expect.stringMatching(/^[a-f0-9]{64}$/),
          name: "Jack",
        }),
      );
    });

    describe("when a sector identifier URI is provided", async () => {
      const client = {
        ...baseClient,
        subjectType: "pairwise",
        idTokenSignedResponseAlg: "none",
      };

      test("it uses the sector identifier URI for encoding", async () => {
        const userId = "usr_1";
        const claims = { name: "Jack" };

        // First get an id_token withouth a sector identifier URI
        const decodedWithout = (
          await roundTrip(client, userId, claims)
        )._unsafeUnwrap();

        // Now get an id_token with a sector identifier URI
        const clientWithSector = {
          ...client,
          sectorIdentifierUri: "https://shared.example.com",
        };
        const decodedWith = (
          await roundTrip(clientWithSector, userId, claims)
        )._unsafeUnwrap();

        expect(decodedWithout.sub).not.toEqual(decodedWith.sub);
      });
    });
  });

  test("undefined claims are ignored", async () => {
    const client = {
      ...baseClient,
      idTokenSignedResponseAlg: "none",
    };

    const userId = "usr_1";
    const claims = { name: "Jack", email: undefined };

    const idToken = await createIdToken(client, userId, claims);
    const decoded = await decodeIdToken(idToken, {
      alg: "none",
    });

    expect(decoded).toEqual(
      ok({
        iss: client.issuer,
        aud: client.clientId,
        exp: expect.any(Number),
        iat: expect.any(Number),
        sub: "usr_1",
        name: "Jack",
      }),
    );
  });
});

describe("decodeIdToken", async () => {
  test("rejects tokens with an invalid signature", async () => {
    const client = {
      ...baseClient,
      idTokenSignedResponseAlg: "RS256",
    };

    const idToken = await createIdToken(client, "usr_1", { name: "Jack" });
    const decoded = await decodeIdToken(idToken, {
      alg: "HS256",
    });

    expect(decoded).toEqual(err("invalid_token"));
  });

  test("rejects expired tokens", async () => {
    const client = {
      ...baseClient,
      idTokenSignedResponseAlg: "RS256",
    };

    const idToken = await createIdToken(client, "usr_1", { name: "Jack" });

    // Mock the current time to be 1 day in the future with vitest
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    vi.useFakeTimers();
    vi.setSystemTime(future);

    const decoded = await decodeIdToken(idToken, {
      alg: "RS256",
    });

    vi.useRealTimers();

    expect(decoded).toEqual(err("invalid_token"));
  });

  test("allows expired tokens if allowExpired is true", async () => {
    const client = {
      ...baseClient,
      idTokenSignedResponseAlg: "RS256",
    };

    const idToken = await createIdToken(client, "usr_1", { name: "Jack" });

    // Mock the current time to be 1 day in the future with vitest
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    vi.useFakeTimers();
    vi.setSystemTime(future);

    const decoded = await decodeIdToken(idToken, {
      alg: "RS256",
      allowExpired: true,
    });

    vi.useRealTimers();

    expect(decoded).toEqual(ok(expect.any(Object)));
  });
});

describe("idTokenHash", async () => {
  describe("when the alg is HS/RS/ES/PS256", async () => {
    test("hashes a value with sha256, returning base64url encoded left half", () => {
      const value = "value";

      ["HS256", "RS256", "ES256", "PS256"].forEach((alg) => {
        const hash = idTokenHash(alg, value);
        expect(hash).toEqual("zUJATVKtVcz6mspK3IKKpQ");
      });
    });
  });

  describe("when the alg is HS/RS/ES/PS384", async () => {
    test("hashes a value with sha384, returning base64url encoded left half", () => {
      const value = "value";

      ["HS384", "RS384", "ES384", "PS384"].forEach((alg) => {
        const hash = idTokenHash(alg, value);
        expect(hash).toEqual("tGx8OeFdPcLNxQ5Cp6KBgaB0zu8Yx8Sq");
      });
    });
  });

  describe("when the alg is HS/RS/ES/PS512 or EdDSA", async () => {
    test("hashes a value with sha512, returning base64url encoded left half", () => {
      const value = "value";

      ["HS512", "RS512", "ES512", "PS512", "EdDSA"].forEach((alg) => {
        const hash = idTokenHash(alg, value);
        expect(hash).toEqual("7CyD7ey2AwTRVOvbhb369hqSvRQuccT3sloVuctfPAo");
      });
    });
  });

  test("it returns undefined with no value", () => {
    expect(idTokenHash("RS256")).toEqual(undefined);
  });

  test("it returns undefined with no alg = none", () => {
    expect(idTokenHash("none", "test")).toEqual(undefined);
  });

  test("it throws an error with an unsupported alg", () => {
    expect(() => idTokenHash("QuantumResistantXOR", "test")).toThrow(
      "Unsupported algorithm: QuantumResistantXOR",
    );
  });
});
