import { checkSessionToken } from "@noo/lib/session";
import { createCookie } from "react-router";
import Sessions from "~/db.server/sessions";

const sessionCookie = createCookie("_noo_session", {
  maxAge: 60 * 60 * 24 * 400,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
});

export async function getSession(request: Request) {
  const cookie = await sessionCookie.parse(request.headers.get("cookie"));
  return await checkSessionToken(cookie, Sessions.find);
}

export async function setSession(token: string): Promise<string> {
  return await sessionCookie.serialize(token);
}
