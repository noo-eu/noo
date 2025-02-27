import { schema } from "@/db";
import {
  createSession,
  deleteSession,
  findSessionById,
  findSessionByIds,
  refreshSession,
} from "@/db/sessions";
import { findUserByEmailOrUsername, findUserById } from "@/db/users";
import argon2 from "argon2";
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

export class SessionsService {
  private tokens: string[];

  constructor(private cookie: string) {
    this.tokens = cookie.split(" ").filter((t) => t.length > 0);
    console.log("Tokens", this.tokens);
  }

  buildCookie() {
    return this.tokens.join(" ");
  }

  async authenticate(username: string, password: string) {
    const user = await findUserByEmailOrUsername(username);
    if (!user) {
      return null;
    }

    // Check if the password is correct
    try {
      if (await argon2.verify(user.passwordDigest!, password)) {
        return user;
      }
    } catch (err) {
      console.error(err);
      return null;
    }

    return null;
  }

  async startSession(userId: string, ip: string, userAgent: string) {
    const sid = crypto.randomUUID();
    const verifier = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16);

    const digest = this.hashSessionVerifier(verifier, salt);
    const saltb64 = salt.toString("base64").replace(/=/g, "");
    const digestb64 = digest.toString("base64").replace(/=/g, "");
    const verifierDigest = `$sha256$${saltb64}$${digestb64}`;

    await createSession({
      id: sid,
      userId: userId,
      verifierDigest: verifierDigest,
      ip,
      userAgent,
    });

    this.tokens.push(this.encodeSession(sid, verifier));
  }

  async deleteSession(sid: string) {
    return await deleteSession(sid);
  }

  async updateSession(sid: string, ip: string, userAgent: string) {
    return await refreshSession(sid, ip, userAgent);
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

    // TODO: check the verifier digest

    return findUserById(session.userId);
  }

  async cleanup() {
    const decoded = this.decodeAll();
    const existingSessions = await this.loadSessions(decoded.map((d) => d.sid));

    // zip the decoded sessions with the existing sessions
    const paired = decoded.map((d) => ({
      cookie: d,
      stored: existingSessions.find((s) => s.id === d.sid)!,
    }));

    const validSessions = paired
      .filter(({ cookie, stored }) => {
        if (!stored) {
          return false;
        }

        const [_, func, b64Salt, b64Digest] = stored.verifierDigest.split("$");
        if (func !== "sha256" || !b64Salt || !b64Digest) {
          // Corrupted verifier :(
          return false;
        }

        const salt = Buffer.from(b64Salt, "base64");
        const digest = Buffer.from(b64Digest, "base64");

        return this.verifySessionVerifier(cookie.verifier, salt, digest);
      })
      .map(({ cookie }) => cookie);

    this.tokens = this.encodeAll(validSessions);
  }

  private loadSession(sessionId: string) {
    return findSessionById(sessionId);
  }

  private loadSessions(sids: string[]) {
    return findSessionByIds(sids);
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
  ): { sid: string; verifier: Buffer } | null {
    if (token.length !== 64) {
      return null;
    }

    const decoded = Buffer.from(token, "base64");
    if (decoded.length !== 48) {
      // This can happen if the "sessionId" contains invalid characters
      return null;
    }

    return {
      sid: this.bufferToUUID(decoded.subarray(0, 16)),
      verifier: decoded.subarray(16, 48),
    };
  }

  private decodeAll(): { sid: string; verifier: Buffer }[] {
    return this.tokens
      .map((token) => this.decodeSessionToken(token))
      .filter((decoded) => decoded !== null);
  }

  private encodeAll(sessions: { sid: string; verifier: Buffer }[]): string[] {
    return sessions.map((session) =>
      this.encodeSession(session.sid, session.verifier),
    );
  }

  private encodeSession(sid: string, verifier: Buffer): string {
    let buff = Buffer.from(sid.replace(/-/g, ""), "hex");
    buff = Buffer.concat([buff, verifier]);
    return buff.toString("base64").replace(/=/g, "");
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
