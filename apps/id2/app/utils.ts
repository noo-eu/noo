import { normalizeLocale } from "@noo/lib/i18n";
import { loadMessages, localeFromRequest } from "@noo/lib/i18n.server";
import { redirect, type Params } from "react-router";
import type { User } from "./db/users.server";
import { getSession } from "./lib/session";

export async function resolveLocale(user: User | undefined, request: Request) {
  // First check from the user session
  if (user) {
    return { locale: normalizeLocale(user.locale), rawLocale: user.locale };
  }

  return localeFromRequest(request);
}

export async function getMessages(locale: string) {
  return loadMessages(locale);
}

export async function loadUserSession(request: Request, params: Params) {
  const { userIdx: rawUserIdx } = params;
  const userIdx = /^-?\d+$/.test(rawUserIdx ?? "")
    ? Number(rawUserIdx)
    : undefined;

  if (userIdx === undefined) {
    throw redirect("/0");
  }

  const session = await getSession(request);
  if (!session) {
    return;
  }

  const activeSessions = session.sessionData.authenticatedSessions;
  if (activeSessions.length <= userIdx) {
    return;
  }

  return undefined; // TODO
}
