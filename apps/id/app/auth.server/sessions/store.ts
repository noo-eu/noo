import { sha256 } from "@noo/lib/crypto";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { createCookie } from "react-router";
import type { SessionError } from "./errors";

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export const sessionCookie = createCookie("__Host-noo-auth", {
  maxAge: COOKIE_MAX_AGE_SECONDS,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  priority: "high",
});

export const sessionCheckCookie = createCookie("_noo-auth-check", {
  maxAge: COOKIE_MAX_AGE_SECONDS,
  httpOnly: false,
  secure: true,
  sameSite: "none",
});

/**
 * Helper function to parse and validate a cookie value.
 *
 * @param cookieParser - The cookie parser (from createCookie)
 * @param cookieHeader - The raw cookie header string
 * @returns ResultAsync containing the cookie value or a SessionError if missing/invalid.
 */
function parseCookieValue(
  cookieParser: ReturnType<typeof createCookie>,
  cookieHeader: string | null,
): ResultAsync<string, SessionError> {
  return ResultAsync.fromPromise(cookieParser.parse(cookieHeader), () => ({
    code: "NO_SESSION" as const,
    message: "Cookie could not be parsed",
  })).andThen((cookie) =>
    cookie
      ? okAsync(cookie)
      : errAsync({
          code: "NO_SESSION" as const,
          message: "Cookie is blank",
          cause: undefined,
        }),
  );
}

/**
 * Read and validate the primary session cookie value.
 *
 * @param request - Incoming HTTP request.
 * @returns ResultAsync containing the cookie value or a SessionError if missing/invalid.
 */
export function getSessionCookie(
  request: Request,
): ResultAsync<string, SessionError> {
  return parseCookieValue(sessionCookie, request.headers.get("cookie"));
}

/**
 * Read and validate the "session check" cookie.
 *
 * @param request - Incoming HTTP request.
 * @returns ResultAsync with the check hash value or a SessionError if missing/invalid.
 */
export function getSessionCheckCookie(
  request: Request,
): ResultAsync<string, SessionError> {
  return parseCookieValue(sessionCheckCookie, request.headers.get("cookie"));
}

/**
 * Append Set-Cookie headers for the primary session and the "check" cookie.
 *
 * @param jar - Response headers collection to which cookies will be appended.
 * @param value - Raw session token string (from {@link encodeSessionToken}).
 * @param version - Container session version to incorporate in the check-hash.
 * @returns Promise that resolves when cookies are serialized.
 */
export async function writeSessionCookies(
  jar: Headers,
  value: string,
  version: number,
) {
  const hash = sha256(`${value}:${version}`).digest("base64url");

  jar.append("Set-Cookie", await sessionCookie.serialize(value));
  jar.append("Set-Cookie", await sessionCheckCookie.serialize(hash));
}

/**
 * Append Set-Cookie headers that expire both the primary and check cookies.
 *
 * @param jar - Response headers collection to which expiration cookies will be appended.
 * @returns Promise that resolves when cookies are serialized.
 */
export async function clearAuthCookies(jar: Headers) {
  const expired = { expires: new Date(0) };
  jar.append("Set-Cookie", await sessionCookie.serialize("", expired));
  jar.append("Set-Cookie", await sessionCheckCookie.serialize("", expired));
}
