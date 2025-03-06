import crypto from "crypto";

export function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input);
}

// This function generates a random opaque string that can be given to the
// client to later use as proof of ownership. This can be used in a number of
// ways, such as for session tokens, password reset tokens, API keys, etc. It
// returns the random string as a base64-encoded string, and a salted SHA-256
// digest of the random string in PHC string format, for secure storage.
export function createVerifier() {
  const verifier = crypto.randomBytes(32);
  const salt = crypto.randomBytes(16);

  const digest = sha256(Buffer.concat([salt, verifier])).digest("base64url");

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

  const newDigest = sha256(Buffer.concat([salt, verifierBuf])).digest();

  return crypto.timingSafeEqual(digest, newDigest);
}

const BASE62_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function hexToBase62(hex: string) {
  let asNumber = BigInt(`0x${hex}`);

  let result = "";
  while (asNumber > 0) {
    const remainder = Number(asNumber % BigInt(BASE62_ALPHABET.length));
    result = BASE62_ALPHABET[remainder] + result;
    asNumber /= BigInt(BASE62_ALPHABET.length);
  }

  return result;
}

export function base62ToHex(base62: string) {
  let result = BigInt(0);
  for (let i = 0; i < base62.length; i++) {
    const char = base62[i];
    const value = BigInt(BASE62_ALPHABET.indexOf(char));
    result = result * BigInt(BASE62_ALPHABET.length) + value;
  }

  return result.toString(16);
}

export function uuidToBase62(uuid: string) {
  return hexToBase62(uuid.replace(/-/g, ""));
}

export function base62ToUuid(base62: string) {
  const hex = base62ToHex(base62).padStart(32, "0");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function uuidToHumanId(uuid: string, prefix: string) {
  return `${prefix}_${uuidToBase62(uuid)}`;
}

export function humanIdToUuid(humanId: string, expectedPrefix: string) {
  const parts = humanId.split("_");
  const id = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join("_");

  if (prefix !== expectedPrefix) {
    return null;
  }

  return base62ToUuid(id);
}
