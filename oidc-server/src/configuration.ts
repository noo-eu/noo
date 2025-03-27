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
  baseUrl: string;
  supportedLocales: string[];
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
