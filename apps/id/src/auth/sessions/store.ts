import { sha256 } from "@/utils";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "_noo_auth";
export const SESSION_CHECK_COOKIE = "_noo_auth_check";

export async function getSessionCookie(): Promise<string> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? "";
}

export async function getSessionCheckCookie(): Promise<string> {
  const store = await cookies();
  return store.get(SESSION_CHECK_COOKIE)?.value ?? "";
}

export async function setSessionCookie(cookie: string) {
  const store = await cookies();
  const hash = sha256(cookie).digest("base64url");

  await store.set(SESSION_COOKIE, cookie, {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  await store.set(SESSION_CHECK_COOKIE, hash, {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: false,
    secure: true,
    sameSite: "none",
  });
}
