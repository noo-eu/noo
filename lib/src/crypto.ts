import crypto from "node:crypto";

export function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input);
}

export function sha1(input: Buffer | string) {
  return crypto.createHash("sha1").update(input);
}
