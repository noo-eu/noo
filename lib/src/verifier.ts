import crypto from "node:crypto";
import { sha256 } from "./crypto";

export function createVerifier() {
  const verifier = crypto.randomBytes(32);
  const salt = crypto.randomBytes(16);

  const digest = sha256(Buffer.concat([salt, verifier])).digest("base64url");

  const verifierDigest = `$sha256$${salt.toString("base64url")}$${digest}`;

  return {
    rawVerifier: verifier,
    verifier: verifier.toString("base64url"),
    digest: verifierDigest,
  };
}

export function checkVerifier(verifier: string, verifierDigest: string) {
  const [_, func, saltEnc, digestEnc] = verifierDigest.split("$");
  if (!saltEnc || !digestEnc || func !== "sha256") {
    return false;
  }

  const verifierBuf = Buffer.from(verifier, "base64url");
  const salt = Buffer.from(saltEnc, "base64url");
  const digest = Buffer.from(digestEnc, "base64url");

  const newDigest = sha256(Buffer.concat([salt, verifierBuf])).digest();

  return crypto.timingSafeEqual(digest, newDigest);
}
