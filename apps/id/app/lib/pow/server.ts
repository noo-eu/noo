import crypto from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { getVerifyingKeyForJwt } from "../../lib.server/jwks";

/**
 * Initialize a PoW (Proof of Work) challenge.
 *
 * @param difficulty The difficulty level for the PoW challenge.
 * @param algorithm The algorithm to use for the PoW challenge. Can be "SHA256" or "Argon2id".
 *
 * @return A JWT object that needs to be signed.
 */
export function startPow(difficulty: number, algorithm: "SHA256" | "Argon2id") {
  if (difficulty < 1) {
    throw new Error("Difficulty must be at least 1");
  }

  const target = BigInt(2) ** BigInt(256 - difficulty);
  const nonce = crypto.randomBytes(32);

  return new SignJWT({
    nonce: nonce.toString("hex"),
    target: target.toString(16),
    algorithm,
  })
    .setIssuedAt()
    .setNotBefore("1s")
    .setExpirationTime("1h")
    .setJti(crypto.randomUUID());
}

export async function verifyPow(token: string, nonce: Buffer) {
  const { payload } = await jwtVerify(token, getVerifyingKeyForJwt);
}
