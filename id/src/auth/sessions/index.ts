import { schema } from "@/db";
import Sessions, { Session } from "@/db/sessions";
import { UserWithTenant } from "@/db/users";
import {
  checkVerifier,
  createVerifier,
  humanIdToUuid,
  uuidToHumanId,
} from "@/utils";
import { inArray } from "drizzle-orm";
import { getSessionCookie, setSessionCookie } from "./store";
import { decodeSessionToken, encodeSessionToken, SessionToken } from "./token";

export function getCookieSessionTokens(cookie: string): SessionToken[] {
  return cookie
    .split(" ")
    .map(decodeSessionToken)
    .filter(Boolean) as SessionToken[];
}

export async function parseValidTokens(cookie: string): Promise<{
  tokens: SessionToken[];
  sessions: Session[];
}> {
  const parsed = getCookieSessionTokens(cookie);

  const sids = parsed.map((t) => t.sid);
  const db = await Sessions.select(inArray(schema.sessions.id, sids));

  const verified = parsed.filter((token) => {
    const session = db.find((s) => s.id === token.sid);
    return session && checkVerifier(token.verifier, session.verifierDigest);
  });

  return {
    tokens: verified,
    sessions: verified.map((t) => db.find((s) => t.sid === s.id)!),
  };
}

export async function createSession(
  userId: string,
  ip: string,
  ua: string,
  cookie?: string,
): Promise<Session> {
  cookie ??= await getSessionCookie();

  const sid = crypto.randomUUID();
  const { verifier, digest } = createVerifier();

  await Sessions.create({
    id: sid,
    userId,
    verifierDigest: digest,
    ip,
    userAgent: ua,
    lastAuthenticatedAt: new Date(),
    lastUsedAt: new Date(),
  });

  const { tokens } = await parseValidTokens(cookie);
  tokens.push({ sid, verifier });

  const newCookie = tokens.map(encodeSessionToken).join(" ");
  await setSessionCookie(newCookie);

  return (await Sessions.find(sid))!;
}

export async function reauthenticateSession(
  sid: string,
  ip: string,
  ua: string,
): Promise<Session> {
  await Sessions.refresh(sid, ip, ua, new Date());
  return (await Sessions.find(sid))!;
}

export async function endSession(sid: string, cookie?: string) {
  cookie ??= await getSessionCookie();
  const { tokens } = await parseValidTokens(cookie);
  const remaining = tokens.filter((t) => t.sid !== sid);

  await Sessions.destroy(sid);

  const newCookie = remaining.map(encodeSessionToken).join(" ");
  await setSessionCookie(newCookie);
}

export async function endAllSessions(cookie?: string) {
  cookie ??= await getSessionCookie();
  const { tokens } = await parseValidTokens(cookie);
  await Promise.all(tokens.map((t) => Sessions.destroy(t.sid)));
  await setSessionCookie("");
}

/**
 * Returns all currently active and verified sessions from the session cookie.
 *
 * Each session is validated against the verifier digest before being returned.
 *
 * @param maxAge - (Optional) The maximum age of the session in seconds. If
 * provided, only sessions that have been active within the last `maxAge`
 * seconds are returned.
 *
 * @returns A list of `Session` objects the user currently has active.
 */
export async function getActiveSessions(maxAge?: number): Promise<Session[]> {
  const cookie = await getSessionCookie();
  const { sessions } = await parseValidTokens(cookie);

  if (maxAge !== undefined) {
    const now = new Date();
    return sessions.filter((s) => {
      const diff = now.getTime() - s.lastUsedAt.getTime();
      return diff < maxAge;
    });
  }

  return sessions;
}

/**
 * Returns the authenticated User object for a given user ID, but only if that
 * user has an active, verified session.
 *
 * @param userId - The user ID to look up. This can be in human-readable
 * format (e.g., "usr_abc123") or UUID format.
 * @param cookie - (Optional) Raw session cookie string. If not provided, the
 * function reads it via `getSessionCookie()`.
 *
 * @returns The authenticated User object if a valid session exists for the
 * given user ID, or `undefined` otherwise.
 *
 * Notes:
 * - This function performs session token validation, including verifier digest
 *   checks.
 * - Returns `undefined` if no matching valid session is found.
 */
export async function getAuthenticatedUser(
  userId: string | undefined,
  cookie?: string,
): Promise<UserWithTenant | undefined> {
  return (await getAuthenticatedSession(userId, cookie))?.user;
}

/**
 * Returns the authenticated session object for a given user ID,
 * but only if that user has an active, verified session in the current cookie.
 *
 * @param userId - The user ID to look up. This can be in human-readable
 * format (e.g., "usr_abc123") or UUID format.
 * @param cookie - (Optional) Raw session cookie string. If not provided, the
 * function reads it via `getSessionCookie()`.
 *
 * @returns The full `Session` object if a verified session exists for the given
 * user ID, or `undefined` otherwise.
 *
 * Notes:
 * - This function validates the session tokens in the cookie and performs
 *   verifier digest checks.
 * - Returns the full session, including timestamps and associated `user`.
 */
export async function getAuthenticatedSession(
  userId: string | undefined,
  cookie?: string,
): Promise<Session | undefined> {
  if (!userId) {
    return;
  }

  cookie ??= await getSessionCookie();

  const { sessions } = await parseValidTokens(cookie);

  if (userId.startsWith("usr_")) {
    userId = humanIdToUuid(userId, "usr")!;
  }

  return sessions.find((s) => s.userId === userId);
}

export async function getFirstAuthenticatedUserId() {
  const cookie = await getSessionCookie();
  const { sessions } = await parseValidTokens(cookie);
  const first = sessions[0];
  return first ? uuidToHumanId(first.userId, "usr") : undefined;
}
