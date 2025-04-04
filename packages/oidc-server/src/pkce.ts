import crypto from "crypto";
import { err, ok, Result } from "neverthrow";
import { sha256 } from "./utils";

export function validatePkce(
  verifier: string | undefined,
  method: string,
  storedChallenge: string,
): Result<null, string> {
  if (!verifier) {
    return err("invalid_request");
  }

  let challenge;
  switch (method) {
    case "S256":
      challenge = sha256(verifier).digest("base64url");
      break;
    default:
      return err("invalid_request");
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(challenge),
      Buffer.from(storedChallenge),
    )
  ) {
    return err("invalid_grant");
  }

  return ok(null);
}
