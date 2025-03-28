import { sha256 } from "@/utils";
import crypto from "crypto";

export function validatePkce(
  verifier: string | undefined,
  method: string,
  storedChallenge: string,
): string | null {
  if (!verifier) {
    return "invalid_request";
  }

  let challenge;
  switch (method) {
    case "plain":
      challenge = verifier;
      break;
    case "S256":
      challenge = sha256(verifier).digest("base64url");
      break;
    default:
      return "invalid_request";
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(challenge),
      Buffer.from(storedChallenge),
    )
  ) {
    return "invalid_grant";
  }

  return null;
}
