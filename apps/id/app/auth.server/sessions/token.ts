import { err, ok, type Result } from "neverthrow";
import type { SessionError } from "./errors";

const TOKEN_VERSION = "v1";

export type SessionToken = {
  id: string;
  verifier: string;
};

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

export function encodeSessionToken({ id, verifier }: SessionToken): string {
  const idBuf = Buffer.from(id.replace(/-/g, ""), "hex");
  const verifierBuf = Buffer.from(verifier, "base64url");
  return `${TOKEN_VERSION}.${Buffer.concat([idBuf, verifierBuf]).toString("base64url")}`;
}

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
