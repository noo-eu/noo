import {
  createSession,
  endAllSessions,
  endSession,
  getActiveSessions,
  getAuthenticatedSession,
  getAuthenticatedUser,
  getFirstAuthenticatedUserId,
  parseValidTokens,
  reauthenticateSession,
} from "~/auth.server/sessions";
import Sessions from "~/db.server/sessions";

import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { getSessionCookie } from "~/auth.server/sessions/store";
import { encodeSessionToken } from "~/auth.server/sessions/token";

vi.mock("~/db.server/sessions");
vi.mock("~/auth.server/sessions/store", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    getSessionCookie: vi.fn(),
  };
});

const mockSession = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "12345678-1234-1234-1234-123456789012",
  verifierDigest:
    "$sha256$s2v0ZvQHg1lsMverSjEk8w$BUMTAlEObGAlkWQQ1rnDrrUcD2kbvCN9i0Of3DwXM2A",
  lastUsedAt: new Date(),
  user: { id: "12345678-1234-1234-1234-123456789012", username: "testuser" },
};

const encodedToken = encodeSessionToken({
  sid: mockSession.id,
  verifier: "yzS-Cx1NFjQlRFiUem8B6zn3S63-kq_XCBnXcoV5YYE",
});

beforeEach(() => {
  vi.clearAllMocks();
  (getSessionCookie as Mock).mockResolvedValue(encodedToken);
});

describe("parseValidTokens", () => {
  it("parses valid tokens", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const { sessions, tokens } = await parseValidTokens(encodedToken);
    expect(sessions).toHaveLength(1);
    expect(tokens).toHaveLength(1);
  });

  it("quickly returns if no tokens", async () => {
    const { sessions, tokens } = await parseValidTokens("");
    expect(sessions).toHaveLength(0);
    expect(tokens).toHaveLength(0);
  });
});

describe("createSession", () => {
  it("creates a session", async () => {
    (Sessions.create as Mock).mockResolvedValue(true);
    (Sessions.find as Mock).mockResolvedValue(mockSession);
    (Sessions.select as Mock).mockResolvedValue([]);

    const cookies = await createSession(
      new Request("http://localhost"),
      mockSession.userId,
    );

    expect(cookies).toBeDefined();
    expect(cookies.length).toBe(2);
  });
});

describe("reauhenticateSession", () => {
  it("reauthenticates a session", async () => {
    (Sessions.refresh as Mock).mockResolvedValue(true);
    (Sessions.find as Mock).mockResolvedValue(mockSession);

    const cookies = await reauthenticateSession(
      new Request("http://localhost"),
      mockSession.id,
    );
    expect(cookies).toBeDefined();
    expect(cookies.length).toBe(2);
  });
});

describe("endSession", () => {
  it("ends a specific session", async () => {
    (Sessions.destroy as Mock).mockResolvedValue(true);
    (Sessions.select as Mock).mockResolvedValue([mockSession]);

    // Returns two new cookies: one for the session and one for the user
    const cookies = await endSession(
      new Request("http://localhost"),
      mockSession.id,
    );

    expect(cookies).toBeDefined();
    expect(cookies.length).toBe(2);
  });
});

describe("endAllSessions", () => {
  it("ends all sessions", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    (Sessions.destroy as Mock).mockResolvedValue(true);

    const cookies = await endAllSessions(new Request("http://localhost"));
    expect(cookies).toBeDefined();
    expect(cookies.length).toBe(2);
  });
});

describe("getActiveSessions", () => {
  it("gets active sessions", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const sessions = await getActiveSessions(new Request("https://localhost"));
    expect(sessions[0].id).toBe(mockSession.id);
  });

  it("respects the maxAge option", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const sessions = await getActiveSessions(
      new Request("https://localhost"),
      100,
    );
    expect(sessions[0].id).toBe(mockSession.id);
  });
});

describe("getAuthenticatedUser", () => {
  it("gets authenticated user", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const user = await getAuthenticatedUser(
      new Request("https://localhost"),
      mockSession.userId,
    );
    expect(user?.id).toBe(mockSession.userId);
  });

  it("doesn't panic with an invalid user id", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const user = await getAuthenticatedUser(
      new Request("https://localhost"),
      "invalid-id",
    );
    expect(user).toBeUndefined();
  });

  it("handles human IDs", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const user = await getAuthenticatedUser(
      new Request("https://localhost"),
      "usr_ylMnww2mkFyl9xLKbutXk",
    );
    expect(user?.id).toBe(mockSession.userId);
  });

  it("handles undefined user ID", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const user = await getAuthenticatedUser(
      new Request("https://localhost"),
      undefined,
    );
    expect(user).toBeUndefined();
  });
});

describe("getAuthenticatedSession", () => {
  it("gets authenticated session", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const session = await getAuthenticatedSession(
      new Request("https://localhost"),
      mockSession.userId,
    );
    expect(session?.userId).toBe(mockSession.userId);
  });
});

describe("getFirstAuthenticatedUserId", () => {
  it("gets first authenticated user ID", async () => {
    (Sessions.select as Mock).mockResolvedValue([mockSession]);
    const uid = await getFirstAuthenticatedUserId(
      new Request("https://localhost"),
    );
    expect(uid).toMatch(/^usr_/); // Assuming uuidToHumanId applies
  });

  it("returns undefined if no sessions", async () => {
    (Sessions.select as Mock).mockResolvedValue([]);
    const uid = await getFirstAuthenticatedUserId(
      new Request("https://localhost"),
    );
    expect(uid).toBeUndefined();
  });
});
