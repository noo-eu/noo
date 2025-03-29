import { Claims } from "./types";

export type Client = {
  clientId: string;
  clientSecret: string;
  subjectType: string;
  sectorIdentifierUri?: string;
  defaultMaxAge?: number;
  redirectUris: string[];
  idTokenSignedResponseAlg: string;
  userinfoSignedResponseAlg: string;
  tokenEndpointAuthMethod: string;

  // Each client will be linked to a specific issuer
  issuer: string;
};

export type Session = {
  userId: string;
  lastAuthenticatedAt: Date;
};

export type AuthorizationCode = {
  id: string;
  authTime: Date;
  claims: Claims;
  codeChallenge: string;
  codeChallengeMethod: string;
  createdAt: Date;
  nonce: string;
  redirectUri: string;
  scopes: string[];
  userId: string;
};

export type AccessToken = {
  id: string;
  userId: string;
  scopes: string[];
  claims: Claims;
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
  getActiveSessions: (maxAge?: number) => Promise<Session[]>;
  encodeSubValue: (sub: string) => string;
  createAuthorizationCode: (params: {}) => Promise<AuthorizationCode>;
  /**
   * Find and return an Authorization Code and its linked client. MUST NOT
   * return a code if it's expired.
   */
  getCode: (
    code: string,
  ) => Promise<{ code: AuthorizationCode; client: Client }>;
  /**
   * Revoke an authorization code. Revoked authorization codes MUST NOT be
   * returned again by getCode. Revoking a code SHOULD also revoke all Access
   * Tokens created from the code.
   * @param codeId
   * @returns
   */
  revokeCode: (codeId: string) => Promise<void>;
  createAccessToken: (params: {}) => Promise<{ id: string }>;
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
  getSessionStateValue: () => string;
};

const configuration: IdPConfiguration = {} as IdPConfiguration;

export function configureIdP(config: Partial<IdPConfiguration>) {
  Object.assign(configuration, config);
}

export default configuration;
