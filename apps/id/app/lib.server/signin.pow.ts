import { randomBytes, sha256 } from "@noo/lib/crypto";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import type { ActionFunctionArgs } from "react-router";
import db, { type Tx } from "~/db.server";
import { acquireLock } from "~/db.server/advisoryLocks";
import KeyValueStore from "~/db.server/key_value_store";
import { getClientIp } from "./http";
import { getSigningKey, getVerifyingKeyForJwt } from "./jwks";

// Failed attempts before PoW kicks in
const POW_TRIGGER_THRESHOLD = 3;
// Starting difficulty (bits) - We aim for ~0.5s solve time
const INITIAL_DIFFICULTY = 17;
// Max difficulty (bits) - We aim for ~8s solve time
const MAX_DIFFICULTY = 20;
// How many bits to add per subsequent failure
const DIFFICULTY_INCREMENT = 1;
// 10 minutes - Time after last failure to reduce difficulty by 1 step
const DIFFICULTY_DECAY_SECS = 120;
// 1 hour - How long the state persists
const IP_STATE_TTL_SECS = 3600;

/**
 * Returns the required PoW difficulty for the current signin attempt.
 * @param request - The GET or POST request to the signin endpoint.
 * @returns An object containing the required PoW difficulty, the last failure time and the number of failures.
 */
export async function getCurrentPowStatus(request: Request, tx?: Tx) {
  const ip = getIp(request);
  if (!ip) {
    throw new Error("Could not get IP address from request");
  }

  let { difficulty, last_failure, failures } = (await KeyValueStore.get<{
    failures: number;
    difficulty: number;
    last_failure: string;
  }>(`${ip}:pow`, tx)) || {
    failures: 0,
    difficulty: 0,
    last_failure: new Date(),
  };
  if (typeof last_failure === "string") {
    last_failure = new Date(last_failure);
  }

  // Decay difficulty if the last failure was a while ago
  const now = new Date();
  const sinceLastFailure = now.getTime() - last_failure.getTime();
  if (difficulty > 0 && sinceLastFailure > DIFFICULTY_DECAY_SECS * 1000) {
    const steps = Math.floor(sinceLastFailure / (DIFFICULTY_DECAY_SECS * 1000));
    difficulty = Math.max(0, difficulty - steps * DIFFICULTY_INCREMENT);
    if (difficulty < INITIAL_DIFFICULTY) {
      failures = 0;
      difficulty = 0;
    }
  }

  return { difficulty, last_failure, failures };
}

/**
 * Constructs a new JWT-signed PoW challenge.
 * @param difficulty - The difficulty of the PoW challenge.
 */
export async function buildPowRequest(difficulty: number) {
  const challenge = randomBytes(64);
  const jti = randomBytes(16);

  const payload = {
    challenge: challenge.toString("hex"),
    difficulty,
    algorithm: "sha256",
  };

  const { key, kid } = (await getSigningKey("EdDSA"))!;
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setIssuedAt()
    .setIssuer("signin-pow")
    .setAudience("signin-pow")
    .setJti(jti.toString("hex"))
    .setExpirationTime("30m")
    .sign(key);
}

export function withPow(
  fn: (
    fnArgs: ActionFunctionArgs,
    formData: FormData,
    tx: Tx,
  ) => Promise<unknown>,
): (fnArgs: ActionFunctionArgs) => Promise<unknown> {
  return async (fnArgs: ActionFunctionArgs) => {
    return await db.transaction(async (tx) => {
      const { request } = fnArgs;

      const ip = getIp(request);
      if (!ip) {
        return new Response("Bad Request", { status: 400 });
      }

      await acquireLock(tx, ipToNumber(ip));

      const { difficulty: requiredPowDifficulty } = await getCurrentPowStatus(
        request,
        tx,
      );
      const isPowRequired = requiredPowDifficulty > 0;

      const formData = await request.formData();
      if (isPowRequired) {
        const requestJwt = formData.get("powRequest")?.toString();
        const nonce = formData.get("powNonce")?.toString();

        if (!requestJwt || !nonce) {
          return { error: "pow_missing", input: {} };
        }

        const challenge = await decodePowChallenge(requestJwt);
        if (!challenge) {
          return { error: "pow_missing", input: {} };
        }

        if (!(await verifyPow(challenge, nonce, requiredPowDifficulty))) {
          return { error: "pow_invalid", requiredPowDifficulty, input: {} };
        }
      }

      return fn(fnArgs, formData, tx);
    });
  };
}

/**
 * Used by the sign-in POST endpoint to mark a failed sign-in attempt due to bad credentials.
 *
 * This function marks the IP address as having failed a sign-in attempt, and if the number of failures
 * exceeds the threshold, it will trigger a PoW challenge for subsequent sign-in attempts.
 *
 * @param request
 * @param tx
 * @returns
 */
export async function markSigninFailure(
  request: Request,
  tx: Tx,
): Promise<void> {
  console.log("Marking sign-in failure");
  const ip = getIp(request);
  if (!ip) {
    return Promise.resolve();
  }

  // Acquire a lock on the IP address
  await acquireLock(tx, ipToNumber(ip));

  // Get the current state of the IP address, with difficulty and failures already decayed
  let { failures, difficulty, last_failure } = await getCurrentPowStatus(
    request,
    tx,
  );

  failures += 1;
  last_failure = new Date();

  if (failures === POW_TRIGGER_THRESHOLD) {
    // If the number of failures is at the threshold, set the difficulty
    difficulty = INITIAL_DIFFICULTY;
  } else if (failures > POW_TRIGGER_THRESHOLD) {
    // Just increment the difficulty
    difficulty = Math.min(difficulty + DIFFICULTY_INCREMENT, MAX_DIFFICULTY);
  }

  console.log(
    `Signin failure from ${ip} - ${failures} failures, difficulty ${difficulty}`,
  );
  await KeyValueStore.set(
    `${ip}:pow`,
    { failures, difficulty, last_failure },
    IP_STATE_TTL_SECS,
    tx,
  );
}

async function decodePowChallenge(challengeJwt: string) {
  try {
    const { payload } = await jwtVerify(challengeJwt, getVerifyingKeyForJwt, {
      audience: "signin-pow",
      algorithms: ["EdDSA"],
    });

    const jti = payload.jti;
    const reuse = await KeyValueStore.get<string>(`pow:${jti}`);
    if (reuse) {
      console.log("PoW challenge already used");
      return null;
    }

    await KeyValueStore.set(`pow:${jti}`, "1", 60 * 60);

    return payload;
  } catch (e) {
    console.error("Failed to decode PoW challenge", e);
    return null;
  }
}

async function verifyPow(
  challenge: JWTPayload,
  solution: string,
  difficulty: number,
) {
  console.log("Verifying PoW challenge", challenge, solution, difficulty);

  const challengeBytes = challenge.challenge;
  if (typeof challengeBytes !== "string") {
    console.error("Invalid challenge format");
    return false;
  }

  try {
    // Parse the solution as an integer (the nonce from client)
    const nonce = parseInt(solution, 10);
    if (isNaN(nonce)) {
      console.error("Invalid nonce format");
      return false;
    }

    // Create buffer matching client implementation: challenge + 4-byte nonce (big-endian)
    const challengeBuffer = Buffer.from(challengeBytes, "hex");
    const nonceBuffer = Buffer.allocUnsafe(4);
    nonceBuffer.writeUInt32BE(nonce, 0);

    const combined = Buffer.concat([challengeBuffer, nonceBuffer]);

    // Compute SHA-256 hash
    const hash = sha256(combined);
    const hashBuffer = Buffer.from(hash.digest("binary"), "binary");

    // Check if hash has required number of leading zero bits
    const requiredZeroBits = difficulty;
    let zeroBits = 0;

    for (let i = 0; i < hashBuffer.length; i++) {
      const byte = hashBuffer[i];
      if (byte === 0) {
        zeroBits += 8;
      } else {
        // Count leading zeros in this byte
        let mask = 0x80;
        while (mask && !(byte & mask)) {
          zeroBits++;
          mask >>= 1;
        }
        break;
      }

      // Early exit if we already have enough zeros
      if (zeroBits >= requiredZeroBits) {
        break;
      }
    }

    const isValid = zeroBits >= requiredZeroBits;
    console.log(
      `PoW verification: ${zeroBits}/${requiredZeroBits} zero bits, valid: ${isValid}`,
    );

    return isValid;
  } catch (error) {
    console.error("Error verifying PoW:", error);
    return false;
  }
}

function getIp(request: Request): string | undefined {
  const ip = getClientIp(request);
  if (!ip) {
    return;
  }

  // Truncate IPv6 addresses to 64 bits
  const ipParts = ip.split(":");
  const truncatedIp =
    ipParts.length > 1 ? ipParts.slice(0, 4).join("_") + "_/64" : ipParts[0];

  return truncatedIp;
}

function ipToNumber(ip: string): number {
  if (ip.endsWith("/64")) {
    ip = ip.slice(0, -4);
  }

  const parts = ip.split("_");
  if (parts.length === 1) {
    // IPv4
    const octets = parts[0].split(".");
    let num = 0;
    for (const octet of octets) {
      num = (num << 8) | parseInt(octet, 10);
    }
    return num;
  }

  // IPv6
  let hex = "";
  for (const part of parts) {
    hex += part.padStart(4, "0");
  }

  return parseInt(hex, 16);
}
