import crypto from "node:crypto";
import { checkVerifier, createVerifier } from "./verifier";

export async function checkSessionToken<T extends { verifierDigest: string }>(
  token: string | undefined,
  retrieveSession: (sid: string) => Promise<T | undefined>,
): Promise<T | undefined> {
  if (!token) {
    return undefined;
  }

  const decoded = decodeSessionToken(token);
  if (!decoded) {
    return undefined;
  }
  const { sid, verifier } = decoded;

  const session = await retrieveSession(sid);
  if (!session) {
    return undefined;
  }

  if (!checkVerifier(verifier, session.verifierDigest)) {
    return undefined;
  }

  return session;
}

export function createSessionToken(): {
  sessionId: string;
  verifierDigest: string;
  token: string;
} {
  const { rawVerifier, digest } = createVerifier();

  const sessionId = crypto.randomUUID();
  const idBuf = Buffer.from(sessionId.replace(/-/g, ""), "hex");

  return {
    sessionId,
    verifierDigest: digest,
    token: Buffer.concat([idBuf, rawVerifier]).toString("base64url"),
  };
}

export function decodeSessionToken(token: string) {
  if (token.length !== 64) {
    return undefined;
  }

  const buf = Buffer.from(token, "base64url");
  if (buf.length !== 48) {
    return undefined;
  }

  return {
    sid: bufferToUUID(buf.subarray(0, 16)),
    verifier: buf.subarray(16).toString("base64url"),
  };
}

function bufferToUUID(buf: Buffer): string {
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
