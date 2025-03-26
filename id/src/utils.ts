import crypto from "crypto";

export function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input);
}

export function sha1(input: Buffer | string) {
  return crypto.createHash("sha1").update(input);
}

export function hmacSha1(key: Buffer | string, input: Buffer | string) {
  return crypto.createHmac("sha1", key).update(input);
}

export function randomSalt(length: number, encoding?: BufferEncoding) {
  return crypto.randomBytes(length).toString(encoding);
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

  for (const char of base62) {
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
    return undefined;
  }

  return base62ToUuid(id);
}

export async function asyncFilter<T>(
  arr: T[],
  predicate: (value: T, index: number, array: T[]) => Promise<boolean>,
): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_, i) => results[i]);
}

export async function asyncFind<T>(
  arr: T[],
  predicate: (value: T, index: number, array: T[]) => Promise<boolean>,
): Promise<T | undefined> {
  for (const [i, value] of arr.entries()) {
    if (await predicate(value, i, arr)) {
      return value;
    }
  }
}

function base32ToBuffer(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32.toUpperCase().replace(/=+$/, "")) {
    const val = alphabet.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

const TOTP_TIMESTEP = 30;
const TOTP_DIGITS = 6;

// https://www.ietf.org/rfc/rfc4226.txt
export function generateTotp(
  secret: string,
  timestamp: number = Date.now(),
): string {
  // Get the current counter value, which is the number of TOTP_TIMESTEP
  // intervals that have passed since the Unix epoch
  const counter = Math.floor(timestamp / 1000 / TOTP_TIMESTEP);

  // Transform the counter to a 64-bit big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Get the HMAC key from the shared secret
  const key = base32ToBuffer(secret);

  // Calculate the HMAC-SHA1 of the counter buffer using the key
  const hmac = hmacSha1(key, counterBuffer).digest();

  // Get an offset value (0 to 15) from the last 4 bits of the HMAC
  const offset = hmac[hmac.length - 1] & 0xf;

  // Extract an unsigned, 4-byte binary value from the HMAC using the offset
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  // Calculate the TOTP value by taking the binary value modulo 10^TOTP_DIGITS
  const modulo = 10 ** TOTP_DIGITS;
  const totp = binary % modulo;

  // Return the TOTP value as a zero-padded string
  return totp.toString().padStart(TOTP_DIGITS, "0");
}

export function verifyTotpWithTolerance(
  secret: string,
  totp: string,
  tolerance: number = 5,
  timestamp: number = Date.now(),
): boolean {
  const attempts = [
    timestamp,
    timestamp - tolerance * 1000,
    timestamp + tolerance * 1000,
  ];

  for (const attempt of attempts) {
    if (generateTotp(secret, attempt) === totp) {
      return true;
    }
  }

  return false;
}
