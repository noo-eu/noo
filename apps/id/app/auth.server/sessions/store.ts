import { sha256 } from "@noo/lib/crypto";
import { err, ok, ResultAsync } from "neverthrow";
import { createCookie } from "react-router";

export const sessionCookie = createCookie("__Host-noo-auth", {
  maxAge: 60 * 60 * 24 * 400,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
});

export const sessionCheckCookie = createCookie("_noo-auth-check", {
  maxAge: 60 * 60 * 24 * 400,
  httpOnly: false,
  secure: true,
  sameSite: "none",
});

export function getSessionCookie(
  request: Request,
): ResultAsync<string, string> {
  return ResultAsync.fromPromise(
    sessionCookie.parse(request.headers.get("cookie")),
    () => "BAD_COOKIE",
  ).andThen((cookie) => (cookie ? ok(cookie) : err("NO_COOKIE")));
}

export async function getSessionCheckCookie(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("cookie");
  return await sessionCheckCookie.parse(cookieHeader);
}

export async function setSessionCookie(value: string) {
  const hash = sha256(value).digest("base64url");

  return [
    await sessionCookie.serialize(value),
    await sessionCheckCookie.serialize(hash),
  ];
}
