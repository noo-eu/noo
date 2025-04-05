export type SessionToken = {
  sid: string;
  verifier: string;
};

export function decodeSessionToken(token: string): SessionToken | null {
  if (token.length !== 64) return null;

  const buf = Buffer.from(token, "base64url");
  if (buf.length !== 48) return null;

  return {
    sid: bufferToUUID(buf.subarray(0, 16)),
    verifier: buf.subarray(16).toString("base64url"),
  };
}

export function encodeSessionToken({ sid, verifier }: SessionToken): string {
  const sidBuf = Buffer.from(sid.replace(/-/g, ""), "hex");
  const verifierBuf = Buffer.from(verifier, "base64url");
  return Buffer.concat([sidBuf, verifierBuf]).toString("base64url");
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
