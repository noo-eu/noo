import { getKeyByAlg } from "@/app/oidc/jwks";
import { OidcClient } from "@/db/oidc_clients";
import Tenants from "@/db/tenants";
import { hexToBase62, sha256, uuidToBase62, uuidToHumanId } from "@/utils";
import { jwtVerify, SignJWT, UnsecuredJWT } from "jose";
import { HttpRequest } from "../http/request";

export async function createIdToken(
  req: HttpRequest,
  client: OidcClient,
  userId: string,
  authTime: Date,
  additonalClaims: Record<string, unknown> = {},
) {
  let issuer = `${req.baseUrl}/oidc`;
  if (client.tenantId) {
    const domain = (await Tenants.find(client.tenantId))!.domain;
    issuer += `/${domain}`;
  }

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

export async function decodeIdToken(idToken: string, alg: string) {
  try {
    if (alg == "none") {
      return UnsecuredJWT.decode(idToken).payload;
    } else {
      const { key } = (await getKeyByAlg(alg))!;
      return (await jwtVerify(idToken, key)).payload;
    }
  } catch {
    return undefined;
  }
}

export function buildSubClaim(client: OidcClient, userId: string) {
  if (client.subjectType == "public") {
    return `usr_${uuidToBase62(userId)}`;
  } else {
    const url = client.sectorIdentifierUri ?? client.redirectUris[0];
    const host = new URL(url).hostname;

    // Hash the user id with the host name
    const hash = sha256(`${host}${userId}${process.env.PAIRWISE_SALT}`).digest(
      "hex",
    );
    return `usr_${hexToBase62(hash)}`;
  }
}
