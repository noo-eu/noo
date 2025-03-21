import { getKeyByAlg, getVerifyingKeyByAlg } from "@/app/oidc/jwks";
import { OidcClient } from "@/db/oidc_clients";
import { hexToBase62, sha256, uuidToBase62, uuidToHumanId } from "@/utils";
import crypto from "crypto";
import { jwtVerify, SignJWT, UnsecuredJWT } from "jose";

export async function createIdToken(
  issuer: string,
  client: OidcClient,
  userId: string,
  authTime: Date,
  additonalClaims: Record<string, unknown> = {},
) {
  // Strip undefined values from the claims
  Object.keys(additonalClaims).forEach(
    (key) => additonalClaims[key] === undefined && delete additonalClaims[key],
  );

  const claims = {
    auth_time: Math.floor(authTime.getTime() / 1000),
    ...additonalClaims,
  };

  const subClaim = buildSubClaim(client, userId);

  if (client.idTokenSignedResponseAlg == "none") {
    return new UnsecuredJWT(claims)
      .setIssuer(issuer)
      .setAudience(uuidToHumanId(client.id, "oidc"))
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(subClaim)
      .encode();
  } else {
    const { kid, key } = (await getKeyByAlg(client.idTokenSignedResponseAlg))!;

    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: client.idTokenSignedResponseAlg, kid })
      .setIssuer(issuer)
      .setAudience(uuidToHumanId(client.id, "oidc"))
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(subClaim)
      .sign(key);
  }
}

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
      const { key } = (await getVerifyingKeyByAlg(alg))!;
      return await jwtVerify(idToken, key);
    }
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export function buildSubClaim(client: OidcClient, userId: string) {
  if (client.subjectType == "public") {
    return `usr_${uuidToBase62(userId)}`;
  } else {
    const url = client.sectorIdentifierUri ?? client.redirectUris[0];
    const host = new URL(url).hostname;

    let salt = process.env.PAIRWISE_SALT;
    if (!salt) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("PAIRWISE_SALT is not set");
      } else {
        console.warn("PAIRWISE_SALT is not set, using a random salt");
        salt = crypto.randomBytes(32).toString("base64");
      }
    }

    // Hash the user id with the host name
    const hash = sha256(`${host}${userId}${salt}`).digest("hex");
    return `usr_${hexToBase62(hash)}`;
  }
}

export function idTokenHash(client: OidcClient, value?: string) {
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
  switch (client.idTokenSignedResponseAlg) {
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
    default:
      throw new Error(
        `Unsupported algorithm: ${client.idTokenSignedResponseAlg}`,
      );
  }

  if (algorithm == "none") {
    return undefined;
  }

  // Hash the value, get the binary representation and take the left-most half,
  // then base64url encode it.
  const hash = crypto.createHash(algorithm).update(value).digest();
  const leftHalf = hash.subarray(0, hash.length / 2);
  return leftHalf.toString("base64url");
}
