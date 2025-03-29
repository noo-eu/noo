import { configureIdP } from "@noo/oidc-server/configuration";
import { HttpRequest } from "../http/request";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import crypto from "node:crypto";
import { hexToBase62, humanIdToUuid, uuidToHumanId } from "@/utils";
import OidcClients from "@/db/oidc_clients";
import { uuid } from "drizzle-orm/pg-core";
import { getActiveSessions } from "@/auth/sessions";

let initialized = false;
export function setup(rawRequest: Request) {
  if (initialized) {
    return;
  }

  const request = new HttpRequest(rawRequest);

  let salt = process.env.PAIRWISE_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAIRWISE_SALT is not set");
    } else {
      console.warn("PAIRWISE_SALT is not set, using a random salt");
      salt = crypto.randomBytes(32).toString("base64");
    }
  }

  configureIdP({
    baseUrl: request.url.origin + "/oidc",
    supportedLocales: SUPPORTED_LANGUAGES,
    pairwiseSalt: salt,
    getClient: async (clientId) => {
      const rawId = humanIdToUuid(clientId, "oidc");
      if (!rawId) {
        return undefined;
      }

      const client = await OidcClients.find(rawId);
      if (!client) {
        return undefined;
      }

      const issuerScope = client.tenantId
        ? "/" + uuidToHumanId(client.tenantId, "org")
        : "";

      return {
        issuer: `${request.url.origin}/oidc${issuerScope}`,

        clientId,
        clientSecret: client.clientSecret,
        subjectType: client.subjectType,
        sectorIdentifierUri: client.sectorIdentifierUri ?? undefined,
        defaultMaxAge: client.defaultMaxAge ?? undefined,
        redirectUris: client.redirectUris,
        idTokenSignedResponseAlg: client.idTokenSignedResponseAlg,
        tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
      };
    },
    getActiveSessions: async (maxAge?: number) => {
      // We're given seconds, but we use milliseconds
      if (maxAge !== undefined) {
        maxAge *= 1000;
      }

      return await getActiveSessions(maxAge);
    },
    encodeSubValue: (sub: string) => {
      return `usr_${hexToBase62(sub)}`;
    },
  });

  initialized = true;
}
