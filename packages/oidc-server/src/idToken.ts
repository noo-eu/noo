import { type JWTPayload, jwtVerify, SignJWT, UnsecuredJWT } from "jose";
import { err, ok, Result } from "neverthrow";
import crypto from "node:crypto";
import configuration, { type Client } from "./configuration";
import { sha256 } from "./utils";

/**
 * Creates an ID Token for a user and client.
 *
 * @param client - The OIDC client for which the ID Token is being created.
 * @param userId - The ID of the user for which the ID Token is being created.
 * @param claims - Claims to include in the ID Token.
 * @returns The ID Token.
 */
export async function createIdToken(
  client: Client,
  userId: string,
  claims: Record<string, unknown>,
) {
  // Strip undefined values from the claims
  Object.keys(claims).forEach(
    (key) => claims[key] === undefined && delete claims[key],
  );

  const subClaim = buildSubClaim(client, userId);

  if (client.idTokenSignedResponseAlg == "none") {
    return new UnsecuredJWT(claims)
      .setIssuer(client.issuer)
      .setAudience(client.clientId)
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(subClaim)
      .encode();
  }

  const { kid, key } = await configuration.getSigningJwk({
    alg: client.idTokenSignedResponseAlg,
  });

  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: client.idTokenSignedResponseAlg, kid })
    .setIssuer(client.issuer)
    .setAudience(client.clientId)
    .setExpirationTime("1h")
    .setIssuedAt()
    .setSubject(subClaim)
    .sign(key);
}

type DecodeIdTokenOptions = {
  alg: string;
  allowExpired?: boolean;
  issuer?: string;
};

/**
 * Verifies and decodes an ID Token.
 *
 * @param idToken - The ID Token to decode.
 * @param options - The options to use when decoding the ID Token.
 *  - alg: The algorithm to use when verifying the ID Token.
 *  - issuer: The expected issuer of the ID Token, if any.
 *  - allowExpired: Whether to allow expired tokens as required by some flows.
 *    Defaults to false.
 *
 * @returns The claims of the ID Token.
 */
export async function decodeIdToken(
  idToken: string,
  { issuer, allowExpired = false, alg }: DecodeIdTokenOptions,
): Promise<Result<JWTPayload, string>> {
  try {
    if (alg === "none") {
      return ok(UnsecuredJWT.decode(idToken).payload);
    }

    const token = await jwtVerify(idToken, configuration.getJwk, {
      algorithms: [alg],
      issuer,

      // An IdP is allowed to accept expired tokens, but most JWT libraries will
      // reject them. Pass a date in the far past to allow expired tokens.
      currentDate: allowExpired ? new Date(0) : new Date(),
    });

    return ok(token.payload);
  } catch (error) {
    return err("invalid_token");
  }
}

/**
 * Creates the sub claim for a user. Depending on the subject_type of the
 * client, the sub claim can either be the user's ID or a more opaque value.
 *
 * @param client - The OIDC client for which the sub claim is being created.
 * @param userId - The ID of the user for which the sub claim is being created.
 * @returns The sub claim.
 */
export function buildSubClaim(client: Client, userId: string) {
  if (client.subjectType == "public") {
    return userId;
  } else {
    const url = client.sectorIdentifierUri ?? client.redirectUris[0];
    const host = new URL(url).hostname;

    // Hash the user id with the host name
    const hash = sha256(`${host}${userId}${configuration.pairwiseSalt}`).digest(
      "hex",
    );

    return configuration.encodeSubValue(hash);
  }
}

/**
 * Hash a string, following the algorithm for hashes included in ID Tokens.
 * @param alg - The id_token signing algorithm, used to determine the hash algorithm.
 * @param value - The value to hash.
 * @returns The hashed value.
 */
export function idTokenHash(alg: string, value?: string) {
  if (!value) {
    return undefined;
  }

  // Its value is the base64url encoding of the left-most half of the hash of
  // the octets of the ASCII representation of the <code/access_token> value,
  // where the hash algorithm used is the hash algorithm used in the alg Header
  // Parameter of the ID Token's JOSE Header. For instance, if the alg is RS256,
  // hash the access_token value with SHA-256, then take the left-most 128 bits
  // and base64url-encode them

  let algorithm: string;
  switch (alg) {
    case "HS256":
    case "RS256":
    case "ES256":
    case "PS256":
      algorithm = "sha256";
      break;
    case "HS384":
    case "RS384":
    case "ES384":
    case "PS384":
      algorithm = "sha384";
      break;
    case "HS512":
    case "RS512":
    case "ES512":
    case "PS512":
    case "EdDSA":
      algorithm = "sha512";
      break;
    case "none":
      return undefined;
    default:
      throw new Error(`Unsupported algorithm: ${alg}`);
  }

  // Hash the value, get the binary representation and take the left-most half,
  // then base64url encode it.
  const hash = crypto.createHash(algorithm).update(value).digest();
  const leftHalf = hash.subarray(0, hash.length / 2);
  return leftHalf.toString("base64url");
}

/**
 * Extracts the audience from the ID Token. The ID Token is not verified at this
 * step. This can be used to determine the algorithm used to sign the ID Token
 * (as this is a client configuration value), which is needed to then verify the
 * ID Token.
 *
 * @param idToken - The ID Token to extract the audience from.
 * @returns The audience of the ID Token, or undefined if it is not present.
 */
export function getInsecureAudience(idToken: string) {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ID Token");
  }

  const payload = Buffer.from(parts[1], "base64url").toString("utf8");
  const decodedPayload = JSON.parse(payload);

  if (!decodedPayload.aud) {
    return;
  }

  return decodedPayload.aud as string;
}
