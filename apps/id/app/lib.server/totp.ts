import crypto from "node:crypto";

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

function hmacSha1(key: Buffer | string, input: Buffer | string) {
  return crypto.createHmac("sha1", key).update(input);
}
