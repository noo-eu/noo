import { err, ok, type Result } from "neverthrow";
import type { SessionError } from "./errors";

const TOKEN_VERSION = "v1";

/**
 * Session token structure containing a session ID and cryptographic verifier.
 *
 * When encoded, the ID (UUID) takes 16 bytes and the verifier takes 32 bytes,
 * totaling 48 bytes. This conveniently encodes to exactly 64 base64url characters,
 * making for efficient and predictable token sizes.
 *
 * When fully encoded encoded, the version is prepended.
 */
export type SessionToken = {
  /** UUID string in canonical 8-4-4-4-12 format (encodes to 16 bytes) */
  id: string;
  /** Base64url-encoded cryptographic verifier (32 bytes when decoded) */
  verifier: string;
};

/**
 * Parse and validate a session token produced by {@link encodeSessionToken}.
 * Expects the format: `${version}.${base64url(uuid_bytes + verifier_bytes)}`.
 *
 * @param token - Raw token string from the cookie (e.g., "v1.XXXX").
 * @returns Result with the decoded `{ id, verifier }` or a SessionError when invalid.
 */
export function decodeSessionToken(
  token: string,
): Result<SessionToken, SessionError> {
  const [ver, raw] = token.split(".", 2);

  if (ver !== TOKEN_VERSION) {
    return err({
      code: "NO_SESSION",
      message: "Invalid session token version",
    });
  }

  if (raw.length !== 64) {
    return err({
      code: "NO_SESSION",
      message: "Invalid session token length",
    });
  }

  const buf = Buffer.from(raw, "base64url");
  if (buf.length !== 48) {
    return err({
      code: "NO_SESSION",
      message: "Invalid session token blob",
    });
  }

  return ok({
    id: bufferToUUID(buf.subarray(0, 16)),
    verifier: buf.subarray(16).toString("base64url"),
  });
}

/**
 * Encode a session token from a UUID and verifier.
 * Produces a versioned, base64url token suitable for cookie storage.
 *
 * @param params - Token parts.
 * @param params.id - UUID string (with dashes).
 * @param params.verifier - Base64url-encoded verifier.
 * @returns The versioned token string.
 */
export function encodeSessionToken({ id, verifier }: SessionToken): string {
  const idBuf = Buffer.from(id.replace(/-/g, ""), "hex");
  const verifierBuf = Buffer.from(verifier, "base64url");
  return `${TOKEN_VERSION}.${Buffer.concat([idBuf, verifierBuf]).toString("base64url")}`;
}

/**
 * Convert a 16-byte buffer into a canonical UUID string.
 *
 * @param buf - A Buffer with at least 16 bytes containing the UUID.
 * @returns UUID string in 8-4-4-4-12 hex format.
 */
export function bufferToUUID(buf: Buffer): string {
  return (
    buf.toString("hex", 0, 4) +
    "-" +
    buf.toString("hex", 4, 6) +
    "-" +
    buf.toString("hex", 6, 8) +
    "-" +
    buf.toString("hex", 8, 10) +
    "-" +
    buf.toString("hex", 10, 16)
  );
}
