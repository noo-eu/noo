import { OidcClient } from "@/db/oidc_clients";
import { hexToBase62, sha256, uuidToBase62, uuidToHumanId } from "@/utils";
import crypto from "crypto";
import { jwtVerify, SignJWT, UnsecuredJWT } from "jose";
import { getSigningKey, getVerifyingKeyForJwt } from "../jwks";

export async function decodeIdToken(
  idToken: string,
  alg: string,
): Promise<Record<string, unknown> | undefined> {
  return (await decodeIdTokenWhole(idToken, alg))?.payload as
    | Record<string, unknown>
    | undefined;
}

export function getIdTokenAlg(idToken: string): string | undefined {
  const [header] = idToken.split(".");
  if (!header) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.from(header, "base64").toString()).alg;
  } catch {
    return undefined;
  }
}

export async function decodeIdTokenWhole(idToken: string, alg: string) {
  try {
    if (alg == "none") {
      return UnsecuredJWT.decode(idToken).payload;
    } else {
      return await jwtVerify(idToken, getVerifyingKeyForJwt);
    }
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
