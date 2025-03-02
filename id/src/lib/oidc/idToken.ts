import { OidcClient } from "@/db/oidc_clients";
import { HttpRequest } from "../http/request";
import { SignJWT, UnsecuredJWT } from "jose";
import { getKeyByAlg } from "@/app/oidc/jwks";
import Tenants from "@/db/tenants";
import { hexToBase62, sha256, uuidToBase62 } from "@/utils";

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
      .setAudience(client.id)
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(subClaim)
      .encode();
  } else {
    const { kid, key } = (await getKeyByAlg(client.idTokenSignedResponseAlg))!;

    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: client.idTokenSignedResponseAlg, kid })
      .setIssuer(issuer)
      .setAudience(client.id)
      .setExpirationTime("1h")
      .setIssuedAt()
      .setSubject(subClaim)
      .sign(key);
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
