import {
  AccessToken,
  AuthorizationCode,
  Client,
  configureIdP,
  Session,
} from "@/configuration";
import { generateKeyPair } from "jose";
import { vi } from "vitest";

let ACTIVE_SESSIONS: Session[] = vi.hoisted(() => []);
export const setActiveSessions = (sessions: Session[]) => {
  ACTIVE_SESSIONS = sessions;
};

let AUTHORIZATION_CODES: Record<
  string,
  { code: AuthorizationCode; client: Client }
> = vi.hoisted(() => ({}));
export const setAuthorizationCodes = (
  codes: Record<string, { code: AuthorizationCode; client: Client }>,
) => {
  AUTHORIZATION_CODES = codes;
};

let ACCESS_TOKENS: Record<
  string,
  { accessToken: AccessToken; client: Client }
> = vi.hoisted(() => ({}));
export const setAccessTokens = (
  ats: Record<string, { accessToken: AccessToken; client: Client }>,
) => {
  ACCESS_TOKENS = ats;
};

const { publicKey, privateKey } = await generateKeyPair("RS256");

configureIdP({
  baseUrl: "https://idp.example.com",
  supportedLocales: ["en", "fr"],

  getClient: vi.fn(),
  getActiveSessions: vi.fn((maxAge) => {
    if (maxAge === undefined) {
      return Promise.resolve(ACTIVE_SESSIONS);
    }

    const minAge = Date.now() - maxAge;
    return Promise.resolve(
      ACTIVE_SESSIONS.filter((s) => s.lastAuthenticatedAt.getTime() >= minAge),
    );
  }),
  getConsent: vi.fn(() => Promise.resolve({ scopes: [], claims: [] })),
  getSigningJwk: vi.fn(() => Promise.resolve({ kid: "1", key: privateKey })),
  getJwk: vi.fn(() => Promise.resolve(publicKey)),
  encodeSubValue: vi.fn((sub) => sub),
  getCode: vi.fn(async (code) => {
    return AUTHORIZATION_CODES[code];
  }),
  createAccessToken: vi.fn(async () => ({
    id: "test_at",
  })),
  getAccessToken: vi.fn(async (at) => {
    return ACCESS_TOKENS[at];
  }),
  revokeCode: vi.fn(async () => {}),
  getClaims: vi.fn(async (_: string, claims: string[]) => {
    const result = {} as Record<string, string>;

    if (claims.includes("given_name")) {
      result.given_name = "John";
    }

    if (claims.includes("family_name")) {
      result.family_name = "Doe";
    }

    return result;
  }),
});
