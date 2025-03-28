export type Client = {
  clientId: string;
  subjectType: string;
  sectorIdentifierUri?: string;
  defaultMaxAge?: number;
  redirectUris: string[];
  idTokenSignedResponseAlg: string;

  // Each client will be linked to a specific issuer
  issuer: string;
};

export type Session = {
  userId: string;
  lastAuthenticatedAt: Date;
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
  createOidcAuthorizationCode: (params: {}) => Promise<{ id: string }>;
  createOidcAccessToken: (params: {}) => Promise<{ id: string }>;
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
