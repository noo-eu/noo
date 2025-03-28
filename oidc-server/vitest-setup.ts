import { configureIdP, Session } from "@/configuration";
import { generateKeyPair } from "jose";
import { vi } from "vitest";

let ACTIVE_SESSIONS: Session[] = vi.hoisted(() => []);
export const setActiveSessions = (sessions: Session[]) => {
  ACTIVE_SESSIONS = sessions;
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
});
