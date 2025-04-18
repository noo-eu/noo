import { hexToBase62, humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { SUPPORTED_LANGUAGES } from "@noo/lib/i18n";
import {
  type AuthorizationCode,
  type Client,
  configureIdP,
} from "@noo/oidc-server/configuration";
import crypto, { randomBytes } from "node:crypto";
import { getActiveSessions } from "~/auth.server/sessions";
import { getSessionCheckCookie } from "~/auth.server/sessions/store";
import OidcAuthorizationCodes from "~/db.server/oidc_authorization_codes";
import OidcClients from "~/db.server/oidc_clients";
import OidcConsents from "~/db.server/oidc_consents";
import Users from "~/db.server/users.server";
import {
  createAccessToken,
  getAccessToken,
  getClient,
  getCode,
} from "./interface";
import { getSigningKey, getVerifyingKeyForJwt } from "./jwks";
import { requestedUserClaims } from "./userClaims";

let initialized = false;
function setup() {
  if (initialized) {
    return;
  }

  let salt = process.env.PAIRWISE_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAIRWISE_SALT is not set");
    } else {
      console.warn("PAIRWISE_SALT is not set, using a random salt");
      salt = crypto.randomBytes(32).toString("base64url");
    }
  }

  configureIdP({
    baseUrl: process.env.OIDC_ISSUER,
    supportedLocales: SUPPORTED_LANGUAGES,
    pairwiseSalt: salt,
    getClient,
    getConsent: async (client, userId: string) => {
      const rawClientId = humanIdToUuid(client.clientId, "oidc");
      if (!rawClientId) {
        throw new Error("Invalid client ID");
      }

      const rawUserId = humanIdToUuid(userId, "usr");
      if (!rawUserId) {
        throw new Error("Invalid user ID");
      }

      return await OidcConsents.findOrInitialize(rawClientId, rawUserId);
    },
    getJwk: getVerifyingKeyForJwt,
    getSigningJwk: async ({ alg }) => (await getSigningKey(alg))!,
    getActiveSessions: async (request: Request, maxAge?: number) => {
      // We're given seconds, but we use milliseconds
      if (maxAge !== undefined) {
        maxAge *= 1000;
      }

      const activeSessions = await getActiveSessions(request, maxAge);
      return activeSessions.map((session) => {
        const userId = uuidToHumanId(session.userId, "usr");

        return {
          userId,
          lastAuthenticatedAt: session.lastAuthenticatedAt,
        };
      });
    },
    encodeSubValue: (sub: string) => {
      return `usr_${hexToBase62(sub)}`;
    },
    createAuthorizationCode: async (
      request: Request,
      params: AuthorizationCode,
    ) => {
      const rawUserId = humanIdToUuid(params.userId, "usr");
      const rawClientId = humanIdToUuid(params.clientId, "oidc");
      if (!rawUserId || !rawClientId) {
        throw new Error("Invalid user ID or client ID");
      }

      let context = {};
      const client = (await OidcClients.find(rawClientId))!;
      if (client.internalClient) {
        const allSessions = await getActiveSessions(request);
        context = {
          sessions: allSessions.map((session) => ({
            sessionId: uuidToHumanId(session.id, "sess"),
            userId: uuidToHumanId(session.userId, "usr"),
          })),
        };
      }

      const code = await OidcAuthorizationCodes.create({
        id: "oidc_code_" + randomBytes(32).toString("base64url"),
        clientId: rawClientId,
        userId: rawUserId,
        authTime: params.authTime,
        redirectUri: params.redirectUri,
        scopes: params.scopes,

        claims: params.claims,
        nonce: params.nonce,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod,
        authContext: context,
      });

      return code;
    },
    getCode,
    revokeCode: async (code: string) => {
      await OidcAuthorizationCodes.destroy(code);
    },

    createAccessToken,
    getAccessToken,

    getClaims: async (userId: string, claimKeys: string[]) => {
      const uid = humanIdToUuid(userId, "usr");
      if (!uid) {
        throw new Error("Invalid user ID");
      }

      const user = await Users.find(uid);
      if (!user) {
        throw new Error("User not found");
      }
      return requestedUserClaims(user, claimKeys);
    },
    getSessionStateValue: getSessionCheckCookie,
    enrichTokenResponse: async (client: Client, code: AuthorizationCode) => {
      const rawClientId = humanIdToUuid(client.clientId, "oidc")!;
      const dbClient = (await OidcClients.find(rawClientId))!;

      if (!dbClient.internalClient) {
        return {};
      }

      return {
        context: code.authorizationContext,
      };
    },
  });

  initialized = true;
}

if (!initialized) {
  setup();
}

export { returnToClient } from "@noo/oidc-server/authorization/finish";
export { performOidcAuthorization } from "@noo/oidc-server/authorization/request";
export { buildAuthorizationResponse } from "@noo/oidc-server/authorization/response";
export { discoveryMetadata } from "@noo/oidc-server/discovery";
export { handleTokenRequest } from "@noo/oidc-server/token/request";
export { handleUserinfo } from "@noo/oidc-server/userinfo";
