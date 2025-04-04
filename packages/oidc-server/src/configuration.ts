import { type JSONWebKeySet } from "jose";
import { type Claims } from "./types";

export type Client = {
  // Each client will be linked to a specific issuer
  issuer: string;

  clientId: string;
  clientSecret: string;
  redirectUris: string[];

  responseTypes: string[];
  grantTypes: string[];
  jwksUri?: string;
  jwks?: JSONWebKeySet;

  sectorIdentifierUri?: string;
  subjectType: string;

  idTokenSignedResponseAlg: string;
  userinfoSignedResponseAlg: string;
  tokenEndpointAuthMethod: string;
  defaultMaxAge?: number;
};

export type Session = {
  userId: string;
  lastAuthenticatedAt: Date;
};

export type AuthorizationCode = {
  id?: string;
  createdAt?: Date;

  authTime: Date;
  claims: Claims;
  clientId: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
  nonce?: string | null;
  redirectUri: string;
  scopes: string[];
  userId: string;
  authorizationContext?: unknown;
};

export type AccessToken = {
  id: string;
  userId: string;
  scopes: string[];
  claims: Claims;
};

export type CreateAccessTokenParams = {
  clientId: string;
  userId: string;
  nonce?: string;
  scopes: string[];
  expiresAt: Date;
  claims?: {
    userinfo?: Record<
      string,
      {
        values?: string[] | undefined;
        value?: string | undefined;
        essential?: boolean | undefined;
      } | null
    >;
    id_token?: Record<
      string,
      {
        values?: string[] | undefined;
        value?: string | undefined;
        essential?: boolean | undefined;
      } | null
    >;
  };
};

export type IdPConfiguration = {
  /**
   * The base URL of the IdP. This is used as the issuer, and all URLs will be
   * relative to this.
   */
  baseUrl: string;

  /**
   * The language codes supported by the IdP. These will be returned in the
   * `ui_locales_supported` field of the discovery document.
   */
  supportedLocales: string[];

  /**
   * The salt used to hash the user ID when the client uses the "pairwise"
   * subject type. This should be a random string that is unique to the IdP.
   * **Warning:** changing this value will cause the sub claim to change for all
   * clients.
   */
  pairwiseSalt: string;

  /**
   * grantedScopes is a list of scopes that are always granted to the client,
   * and do not need to be explicitly consented to by the user. Defaults to
   * "openid"
   */
  grantedScopes: string[];

  /**
   * grantedClaims is a list of claims that are always granted to the client,
   * and do not need to be explicitly consented to by the user. Defaults to some
   * technical claims like "sub", "aud", "exp", etc. To ensure a smooth
   * experience prefer extending this list, avoid removing any of the default
   * claims.
   */
  grantedClaims: string[];

  getClient: (clientId: string) => Promise<Client | undefined>;
  getConsent: (
    client: Client,
    userId: string,
  ) => Promise<{ scopes: string[]; claims: string[] }>;
  getJwk: ({ alg }: { alg: string }) => Promise<CryptoKey>;
  getSigningJwk: ({
    alg,
  }: {
    alg: string;
  }) => Promise<{ key: CryptoKey; kid: string }>;
  getActiveSessions: (request: Request, maxAge?: number) => Promise<Session[]>;
  encodeSubValue: (sub: string) => string;
  createAuthorizationCode: (
    request: Request,
    params: AuthorizationCode,
  ) => Promise<AuthorizationCode>;
  /**
   * Find and return an Authorization Code and its linked client. MUST NOT
   * return a code if it's expired.
   */
  getCode: (
    code: string,
  ) => Promise<{ code: AuthorizationCode; client: Client } | undefined>;
  /**
   * Revoke an authorization code. Revoked authorization codes MUST NOT be
   * returned again by getCode. Revoking a code SHOULD also revoke all Access
   * Tokens created from the code.
   * @param codeId
   * @returns
   */
  revokeCode: (codeId: string) => Promise<void>;
  createAccessToken: (
    params: CreateAccessTokenParams,
  ) => Promise<{ id: string }>;
  /**
   * Find and return an access token and its linked client. MUST NOT return a
   * token if it's expired.
   */
  getAccessToken: (accessToken: string) => Promise<
    | {
        client: Client;
        accessToken: AccessToken;
      }
    | undefined
  >;
  getClaims: (
    userId: string,
    claims: string[],
  ) => Promise<Record<string, unknown>>;
  getSessionStateValue: (request: Request) => Promise<string>;

  /**
   * Allows the IdP to add custom fields to the token response. This can be used
   * for non-standard functionality.
   * @param client
   * @param code
   * @returns
   */
  enrichTokenResponse: (
    client: Client,
    code: AuthorizationCode,
  ) => Promise<Record<string, unknown>>;
};

let configuration: IdPConfiguration = {
  grantedScopes: ["openid"],
  grantedClaims: [
    "acr",
    "amr",
    "azp",
    "aud",
    "auth_time",
    "exp",
    "iat",
    "iss",
    "nonce",
    "sub",
    "locale",
    "zoneinfo",
    "updated_at",
  ],
  enrichTokenResponse: async () => {
    return {} as Record<string, unknown>;
  },
} as unknown as IdPConfiguration;

export function configureIdP(config: Partial<IdPConfiguration>) {
  configuration = Object.assign(configuration, config);
}

export default configuration;
