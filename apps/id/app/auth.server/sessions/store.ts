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
});

export const sessionCheckCookie = createCookie("_noo-auth-check", {
  maxAge: COOKIE_MAX_AGE_SECONDS,
  httpOnly: false,
  secure: true,
  sameSite: "none",
});

export function getSessionCookie(
  request: Request,
): ResultAsync<string, SessionError> {
  return ResultAsync.fromPromise(
    sessionCookie.parse(request.headers.get("cookie")),
    () => ({
      code: "NO_SESSION" as const,
      message: "Cookie could not be parsed",
    }),
  ).andThen((cookie) =>
    cookie
      ? okAsync(cookie)
      : errAsync({
          code: "NO_SESSION" as const,
          message: "Cookie is blank",
          cause: undefined,
        }),
  );
}

export function getSessionCheckCookie(
  request: Request,
): ResultAsync<string, SessionError> {
  const cookieHeader = request.headers.get("cookie");
  return ResultAsync.fromPromise(
    sessionCheckCookie.parse(cookieHeader),
    () => ({
      code: "NO_SESSION" as const,
      message: "Cookie could not be parsed",
    }),
  ).andThen((cookie) =>
    cookie
      ? okAsync(cookie)
      : errAsync({
          code: "NO_SESSION" as const,
          message: "Cookie is blank",
          cause: undefined,
        }),
  );
}

export async function writeSessionCookies(
  jar: Headers,
  value: string,
  version: number,
) {
  const hash = sha256(`${value}:${version}`).digest("base64url");

  jar.append("Set-Cookie", await sessionCookie.serialize(value));
  jar.append("Set-Cookie", await sessionCheckCookie.serialize(hash));
}

export async function clearAuthCookies(jar: Headers) {
  const expired = { expires: new Date(0) };
  jar.append("Set-Cookie", await sessionCookie.serialize("", expired));
  jar.append("Set-Cookie", await sessionCheckCookie.serialize("", expired));
}
