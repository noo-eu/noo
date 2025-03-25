import { CryptoKey, importJWK, JWSHeaderParameters } from "jose";
import { allPublicKeys, currentPrivateKeys } from "./store";

export type Jwk = JsonWebKey & { kid?: string };

export async function getSigningKey(alg: string) {
  const keys = await currentPrivateKeys();
  return selectKeyByAlg(keys, alg);
}

export async function getVerifyingKeyForJwt(
  header: JWSHeaderParameters,
): Promise<CryptoKey> {
  const keys = await allPublicKeys();
  const key = await selectKeyByAlg(
    keys,
    header.alg as string,
    header.kid as string,
  );
  if (!key) {
    throw new Error("No key found for JWT verification");
  }

  return key.key;
}

const ALG_TO_KTY = {
  RS256: "RSA",
  RS384: "RSA",
  RS512: "RSA",
  ES256: "EC",
  ES384: "EC",
  ES512: "EC",
  EdDSA: "OKP",
} as Record<string, string>;

async function selectKeyByAlg(
  jwks: Jwk[],
  alg: string,
  kid?: string,
): Promise<{ kid: string; key: CryptoKey } | undefined> {
  // If kid is given, only return the key with that kid
  if (kid) {
    const kidMatch = jwks.find((key) => key.kid === kid);
    if (kidMatch) {
      if (kidMatch.alg === alg) {
        return importKey(kidMatch, alg);
      }
    }

    return;
  }

  // Find a key given the alg
  const algMatch = jwks.find((key) => key.alg === alg);
  if (algMatch) {
    return importKey(algMatch, alg);
  }

  // Find a suitable key based on kty
  const kty = ALG_TO_KTY[alg];
  if (!kty) {
    return;
  }

  const ktyMatch = jwks.find((key) => key.kty === kty);
  if (ktyMatch) {
    return importKey(ktyMatch, alg);
  }
}

async function importKey(
  key: Jwk,
  alg: string,
): Promise<{ kid: string; key: CryptoKey }> {
  return {
    kid: key.kid!,
    key: (await importJWK(key, alg)) as CryptoKey,
  };
}
