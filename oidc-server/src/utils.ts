import crypto from "node:crypto";

export function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input);
}
