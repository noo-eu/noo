import { generateKeyPair } from "jose";
import { afterEach, vi } from "vitest";
import { AuthorizationCode, configureIdP } from "./src/configuration";

const { publicKey, privateKey } = await generateKeyPair("RS256");

configureIdP({
  baseUrl: "https://idp.example.com",
  supportedLocales: ["en", "fr"],
  pairwiseSalt: "default-test-salt", // Add a default

  // Provide basic, non-stateful default mocks
  getClient: vi.fn(), // Default: client not found
  getActiveSessions: vi.fn(async () => []), // Default: no active sessions
  getConsent: vi.fn(async () => ({ scopes: [], claims: [] })), // Default: no consent
  getSigningJwk: vi.fn(async () => ({ kid: "default-kid", key: privateKey })),
  getJwk: vi.fn(async () => publicKey),
  encodeSubValue: vi.fn((sub) => `usr_${sub}`),
  getCode: vi.fn(),
  createAuthorizationCode: vi.fn(
    async () =>
      ({
        code: "default_code",
        clientId: "default_client_id",
      }) as unknown as AuthorizationCode,
  ),
  revokeCode: vi.fn(),
  createAccessToken: vi.fn(async () => ({
    id: "default_access_token",
  })),
  getAccessToken: vi.fn(),
  getClaims: vi.fn(async () => ({})),
  getSessionStateValue: vi.fn(async () => "default_session_state"),
});

afterEach(() => {
  vi.restoreAllMocks();
});
