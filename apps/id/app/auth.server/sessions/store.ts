import { sha256 } from "@noo/lib/crypto";
import { createCookie } from "react-router";

export const sessionCookie = createCookie("_noo_auth", {
  maxAge: 60 * 60 * 24 * 400,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
});

export const sessionCheckCookie = createCookie("_noo_auth_check", {
  maxAge: 60 * 60 * 24 * 400,
  httpOnly: false,
  secure: true,
  sameSite: "none",
});

export async function getSessionCookie(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("cookie");
  return (await sessionCookie.parse(cookieHeader)) ?? "";
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
