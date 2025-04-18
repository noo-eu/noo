import { err, ok, type Result, type ResultAsync } from "neverthrow";
import crypto from "node:crypto";
import db from "~/db.server";
import {
  acquireLockWithUUID,
  TOTP_LOCK_NAMESPACE,
} from "~/db.server/advisoryLocks";
import KeyValueStore from "~/db.server/key_value_store";
import type { User } from "~/db.server/users.server";

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

// https://www.ietf.org/rfc/rfc4226.txt
export function generateTotp(
  secret: string,
  timestamp: number = Date.now(),
  digits: number = 6,
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

  // Calculate the TOTP value by taking the binary value modulo 10^digits
  const modulo = 10 ** digits;
  const totp = binary % modulo;

  // Return the TOTP value as a zero-padded string
  return totp.toString().padStart(digits, "0");
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

const TOTP_RATE_LIMIT_DELAYS = [0, 0, 2, 5, 10, 20, 30, 60, 120, 240, 600, 900];

export async function verifyTotpRateLimited(
  user: User,
  code: string,
): Promise<
  Result<void, { error: "rate_limit" | "invalid_totp"; lockedUntil?: Date }>
> {
  return await db.transaction(async (tx) => {
    await acquireLockWithUUID(tx, user.id, TOTP_LOCK_NAMESPACE);

    const now = new Date();

    let { failures, lock_until } = (await KeyValueStore.get<{
      failures: number;
      lock_until: string;
    }>(`${user.id}:totp_rate_limit`)) || {
      failures: 0,
      lock_until: now,
    };

    if (typeof lock_until === "string") {
      lock_until = new Date(lock_until);
    }

    if (lock_until > now) {
      console.log("Rate limit exceeded");
      return err({ error: "rate_limit", lockedUntil: lock_until });
    }

    if (verifyTotpWithTolerance(user.otpSecret!, code)) {
      await KeyValueStore.destroy(`${user.id}:totp_rate_limit`);
      return ok();
    } else {
      console.log("Invalid TOTP code");
      const delay = TOTP_RATE_LIMIT_DELAYS[failures] ?? 900;

      await KeyValueStore.set(
        `${user.id}:totp_rate_limit`,
        {
          failures: failures + 1,
          lock_until: new Date(now.getTime() + delay * 1000),
        },
        // expire in 2 hours
        60 * 60 * 2,
      );

      return err({ error: "invalid_totp" });
    }
  });
}
