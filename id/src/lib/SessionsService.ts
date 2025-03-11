import { schema } from "@/db";
import Sessions, { Session } from "@/db/sessions";
import { User } from "@/db/users";
import { checkVerifier, createVerifier, humanIdToUuid, sha256 } from "@/utils";
import { inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "node:crypto";

// Multiple users can be logged in at the same time on the same device. We keep
// all session identifiers in a single cookie.
//
// The cookie is a space-separated list of session identifiers. Each session
// identifier is a base64-encoded string, made of a 128-bit Session ID (an UUID,
// 16 bytes) and a 256-bit Session Verifier (32 bytes). The encoded string is 64
// characters long. With a 4096 cookie size limit, we can store up to 62 session
// identifiers.
//
// In the database, these are stored as the id (UUID) and verifier_digest, which
// is a hash of the verifier, stored in PHC string format. We currently use
// SHA-256 for the verifier hash with a 16-byte salt.

export const SESSION_COOKIE_NAME = "_noo_auth";
export const SESSION_CHECK_COOKIE_NAME = "_noo_auth_check";

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
}

export async function setSessionCookie(value: string) {
  const cookieStore = await cookies();

  // Secure cookies are only sent over HTTPS, with the exception of localhost.
  // If you are using Safari, this exception does not apply... use another browser for development.

  await cookieStore.set(SESSION_COOKIE_NAME, value, {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: true,
    secure: true,
    // TODO: determine if "none" is really required, or if "lax" is sufficient
    sameSite: "lax",
  });

  await cookieStore.set(
    SESSION_CHECK_COOKIE_NAME,
    sha256(value).digest("base64url"),
    {
      maxAge: 60 * 60 * 24 * 400,
      httpOnly: false,
      secure: true,
      // Note: "none" only works if secure is true. If you are disabling
      // `secure` for development purposes, know that this will break the
      // cookie.
      sameSite: "none",
    },
  );
}

export async function getSessionCheckCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_CHECK_COOKIE_NAME)?.value ?? "";
}

export async function getUserForSession(sessionId: string) {
  const cookie = await getSessionCookie();
  const service = new SessionsService(cookie);
  return service.getUserBySid(sessionId);
}

export async function getSessions() {
  const manager = new SessionsService(await getSessionCookie());
  return manager.activeSessions();
}

export async function getFirstSession() {
  const manager = new SessionsService(await getSessionCookie());
  return (await manager.activeSessions())[0];
}

export class SessionsService {
  private tokens: string[];

  constructor(cookie: string) {
    this.tokens = cookie.split(" ").filter((t) => t.length > 0);
  }

  static async new() {
    return new SessionsService(await getSessionCookie());
  }

  buildCookie() {
    return this.tokens.join(" ");
  }

  static async userFor(userId: string) {
    const manager = await SessionsService.new();
    const sessions = await manager.activeSessions();
    const uuid = humanIdToUuid(userId, "usr");
    if (!uuid) {
      return undefined;
    }

    return sessions.find((s) => s.userId === uuid)?.user;
  }

  static async user(userId?: string) {
    if (!userId) {
      const manager = await SessionsService.new();
      const sessions = await manager.activeSessions();
      return sessions[0]?.user;
    }

    return await SessionsService.userFor(userId);
  }

  async startSession(userId: string, ip: string, userAgent: string) {
    const sid = crypto.randomUUID();

    const { verifier, digest } = createVerifier();

    await Sessions.create({
      id: sid,
      userId: userId,
      verifierDigest: digest,
      ip,
      userAgent,
      lastAuthenticatedAt: new Date(),
      lastUsedAt: new Date(),
    });

    // Cleanup the old or tampered sessions from the cookie
    await this.cleanup();

    this.tokens.push(this.encodeSession(sid, verifier));

    // This returns the user along with the session
    return (await Sessions.find(sid))!;
  }

  async endSession(sid: string) {
    this.tokens = this.tokens.filter((t) => {
      const decoded = this.decodeSessionToken(t);
      return decoded?.sid !== sid;
    });

    return await this.deleteSession(sid);
  }

  async endAllSessions() {
    const sessions = this.decodeAll();
    this.tokens = [];
    await Promise.all(sessions.map((s) => this.deleteSession(s.sid)));
  }

  async deleteSession(sid: string) {
    return await Sessions.destroy(sid);
  }

  async updateSession(sid: string, ip: string, userAgent: string) {
    return await Sessions.refresh(sid, ip, userAgent);
  }

  async reauthenticate(sid: string, ip: string, userAgent: string) {
    return await Sessions.refresh(sid, ip, userAgent, new Date());
  }

  async getUser(sessionIndex: number = 0) {
    const sessionData = this.getSessionData(sessionIndex);
    if (!sessionData) {
      return undefined;
    }

    const session = await this.loadSession(sessionData.sid);
    if (!session) {
      return undefined;
    }

    if (!checkVerifier(sessionData.verifier, session.verifierDigest)) {
      return undefined;
    }

    return session.user;
  }

  async getSessionBySid(sessionId: string) {
    const allSessions = this.decodeAll();
    const session = allSessions.find((s) => s.sid === sessionId);
    if (!session) {
      return undefined;
    }

    const storedSession = await this.loadSession(session.sid);
    if (!storedSession) {
      return undefined;
    }

    if (!checkVerifier(session.verifier, storedSession.verifierDigest)) {
      return undefined;
    }

    return storedSession;
  }

  async getUserBySid(sessionId: string) {
    const session = await this.getSessionBySid(sessionId);
    if (!session) {
      return undefined;
    }

    return session.user;
  }

  async cleanup() {
    const decoded = this.decodeAll();
    const existingSessions = await this.loadSessions(decoded.map((d) => d.sid));

    // zip the decoded sessions with the existing sessions
    const paired = decoded.map((d) => ({
      cookie: d,
      stored: existingSessions.find((s) => s.id === d.sid)!,
    }));

    const validPairs = paired.filter(({ cookie, stored }) => {
      if (!stored) {
        return false;
      }

      return checkVerifier(cookie.verifier, stored.verifierDigest);
    });

    const validTokens = validPairs.map(({ cookie }) => cookie);
    this.tokens = this.encodeAll(validTokens);

    return validPairs.map(({ stored }) => stored);
  }

  async activeSessions(maxAge?: number) {
    const active = await this.cleanup();

    if (maxAge !== undefined) {
      const now = new Date();
      return active.filter((s) => {
        const diff = now.getTime() - s.lastUsedAt.getTime();
        return diff < maxAge;
      });
    }

    return active;
  }

  async sessionFor(user: User): Promise<Session | undefined> {
    const sessions = await this.activeSessions();
    return sessions.find((s) => s.userId === user.id);
  }

  private loadSession(sessionId: string) {
    return Sessions.find(sessionId);
  }

  private loadSessions(sids: string[]) {
    return Sessions.select(inArray(schema.sessions.id, sids));
  }

  private getSessionData(index: number) {
    const token = this.tokens[index];
    if (!token) {
      return null;
    }

    return this.decodeSessionToken(token);
  }

  private decodeSessionToken(
    token: string,
  ): { sid: string; verifier: string } | null {
    if (token.length !== 64) {
      return null;
    }

    const decoded = Buffer.from(token, "base64url");
    if (decoded.length !== 48) {
      // This can happen if the "sessionId" contains invalid characters
      return null;
    }

    return {
      sid: this.bufferToUUID(decoded.subarray(0, 16)),
      verifier: decoded.subarray(16).toString("base64url"),
    };
  }

  private decodeAll(): { sid: string; verifier: string }[] {
    return this.tokens
      .map((token) => this.decodeSessionToken(token))
      .filter((decoded) => decoded !== null);
  }

  private encodeAll(sessions: { sid: string; verifier: string }[]): string[] {
    return sessions.map((session) =>
      this.encodeSession(session.sid, session.verifier),
    );
  }

  private encodeSession(sid: string, verifier: string): string {
    let buff = Buffer.from(sid.replace(/-/g, ""), "hex");
    buff = Buffer.concat([buff, Buffer.from(verifier, "base64url")]);
    return buff.toString("base64url");
  }

  private bufferToUUID(buffer: Buffer): string {
    return (
      buffer.toString("hex", 0, 4) +
      "-" +
      buffer.toString("hex", 4, 6) +
      "-" +
      buffer.toString("hex", 6, 8) +
      "-" +
      buffer.toString("hex", 8, 10) +
      "-" +
      buffer.toString("hex", 10, 16)
    );
  }

  private verifySessionVerifier(
    verifier: Buffer,
    salt: Buffer,
    digest: Buffer,
  ): boolean {
    if (verifier.length !== 32 || salt.length !== 16 || digest.length !== 32) {
      return false;
    }

    // Hash the verifier with the salt
    const hashedVerifier = this.hashSessionVerifier(verifier, salt);

    // Compare the digest with the hashed verifier
    return crypto.timingSafeEqual(digest, hashedVerifier);
  }

  private hashSessionVerifier(verifier: Buffer, salt: Buffer): Buffer {
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.concat([salt, verifier]));
    return hash.digest();
  }
}
