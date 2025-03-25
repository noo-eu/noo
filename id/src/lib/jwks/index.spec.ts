import { describe, expect, it } from "vitest";
import { getSigningKey, getVerifyingKeyForJwt } from "./index";
import { allPublicKeys } from "./store";

describe("getSigningKey", () => {
  it("returns a private key for the given alg", async () => {
    const key = (await getSigningKey("RS256"))!;
    expect(key.key).toBeDefined();
    expect(key.kid).toBeDefined();

    const privKey = key.key;
    expect(privKey.type).toBe("private");
  });
});

describe("getVerifyingKeyForJwt", () => {
  it("returns a public key for the given alg and kid", async () => {
    const noKid = { alg: "RS256" };
    const key = await getVerifyingKeyForJwt(noKid);
    expect(key.type).toBe("public");

    const rs256key = (await allPublicKeys()).find((key) => key.kty === "RSA")!;
    const withKid = { alg: "RS256", kid: rs256key.kid };
    const keyWithKid = await getVerifyingKeyForJwt(withKid);
    expect(keyWithKid.type).toBe("public");
  });

  it("throws an error if no key is found", async () => {
    const noKey = { alg: "RS256", kid: "unknown" };
    await expect(getVerifyingKeyForJwt(noKey)).rejects.toThrow(
      "No key found for JWT verification",
    );

    const noAlg = { alg: "unknown" };
    await expect(getVerifyingKeyForJwt(noAlg)).rejects.toThrow(
      "No key found for JWT verification",
    );
  });
});
