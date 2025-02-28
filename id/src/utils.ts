import { headers } from "next/headers";
import crypto from "crypto";

export async function getIpAddress() {
  const headerStore = await headers();
  const ipHeader =
    headerStore.get("x-real-ip") ||
    headerStore.get("x-forwarded-for") ||
    "0.0.0.0";
  return ipHeader.split(",")[0];
}

export async function getUserAgent() {
  const headerStore = await headers();
  return headerStore.get("user-agent") || "";
}

export async function getBearerToken() {
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

// This function generates a random opaque string that can be given to the
// client to later use as proof of ownership. This can be used in a number of
// ways, such as for session tokens, password reset tokens, API keys, etc. It
// returns the random string as a base64-encoded string, and a salted SHA-256
// digest of the random string in PHC string format, for secure storage.
export function createVerifier() {
  const verifier = crypto.randomBytes(32);
  const salt = crypto.randomBytes(16);

  const digest = crypto
    .createHash("sha256")
    .update(Buffer.concat([salt, verifier]))
    .digest("base64url");

  const verifierDigest = `$sha256$${salt.toString("base64url")}$${digest}`;

  return {
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

  const newDigest = crypto
    .createHash("sha256")
    .update(Buffer.concat([salt, verifierBuf]))
    .digest();

  return crypto.timingSafeEqual(digest, newDigest);
}
