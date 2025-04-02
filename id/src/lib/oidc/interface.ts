import OidcAccessTokens from "@/db/oidc_access_tokens";
import OidcAuthorizationCodes from "@/db/oidc_authorization_codes";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { Session } from "@/db/sessions";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import {
  AuthorizationCode,
  Client,
  CreateAccessTokenParams,
  Session as OidcSession,
} from "@noo/oidc-server/configuration";

export async function getClient(clientId: string) {
  const rawId = humanIdToUuid(clientId, "oidc");
  if (!rawId) {
    return undefined;
  }

  const client = await OidcClients.find(rawId);
  if (!client) {
    return undefined;
  }

  return dbClientToClient(client);
}

export async function getCode(code: string): Promise<
  | {
      code: AuthorizationCode;
      client: Client;
    }
  | undefined
> {
  const dbCode = await OidcAuthorizationCodes.find(code);
  if (!dbCode) {
    return undefined;
  }

  const clientId = uuidToHumanId(dbCode.clientId, "oidc");
  if (!clientId) {
    throw new Error("Invalid client ID");
  }

  const client = await OidcClients.find(dbCode.clientId);
  if (!client) {
    throw new Error("Invalid client");
  }

  const userId = uuidToHumanId(dbCode.userId, "usr");
  if (!userId) {
    throw new Error("Invalid user ID");
  }
  const authTime = dbCode.authTime;

  return {
    code: {
      id: code,
      createdAt: dbCode.createdAt,
      clientId: clientId,
      userId: userId,
      authTime,
      redirectUri: dbCode.redirectUri,
      scopes: dbCode.scopes,
      claims: dbCode.claims,
      nonce: dbCode.nonce,
      codeChallenge: dbCode.codeChallenge,
      codeChallengeMethod: dbCode.codeChallengeMethod,
      authorizationContext: dbCode.authContext,
    },
    client: dbClientToClient(client),
  };
}

export async function createAccessToken(params: CreateAccessTokenParams) {
  const at = await OidcAccessTokens.create({
    clientId: humanIdToUuid(params.clientId, "oidc")!,
    userId: humanIdToUuid(params.userId, "usr")!,
    nonce: params.nonce,
    scopes: params.scopes,
    claims: params.claims,
    expiresAt: params.expiresAt,
  });

  return {
    id: uuidToHumanId(at.id, "oidc_at"),
    expiresAt: at.expiresAt,
    scopes: at.scopes,
    claims: at.claims,
  };
}

export async function getAccessToken(accessToken: string) {
  const at = await OidcAccessTokens.find(
    humanIdToUuid(accessToken, "oidc_at")!,
  );
  if (!at) {
    return undefined;
  }

  const client = await OidcClients.find(at.clientId);
  if (!client) {
    throw new Error("Invalid client");
  }

  return {
    accessToken: {
      id: accessToken,
      userId: uuidToHumanId(at.userId, "usr"),
      scopes: at.scopes,
      claims: at.claims,
    },
    client: dbClientToClient(client),
  };
}

export function dbClientToClient(client: OidcClient): Client {
  const tenantId = client.tenantId;
  let scope = "";
  if (tenantId) {
    scope += "/" + uuidToHumanId(tenantId, "org");
  }

  return {
    issuer: `${process.env.OIDC_ISSUER}${scope}`,

    clientId: uuidToHumanId(client.id, "oidc"),
    clientSecret: client.clientSecret,
    redirectUris: client.redirectUris,

    responseTypes: client.responseTypes,
    grantTypes: client.grantTypes,
    jwksUri: client.jwksUri ?? undefined,
    jwks: client.jwks ?? undefined,

    sectorIdentifierUri: client.sectorIdentifierUri ?? undefined,
    subjectType: client.subjectType,

    idTokenSignedResponseAlg: client.idTokenSignedResponseAlg,
    tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
    userinfoSignedResponseAlg: client.userinfoSignedResponseAlg ?? "none",
    defaultMaxAge: client.defaultMaxAge ?? undefined,
  };
}

export function dbSessionToSession(session: Session): OidcSession {
  return {
    userId: uuidToHumanId(session.userId, "usr"),
    lastAuthenticatedAt: session.lastAuthenticatedAt,
  };
}
