import { loadMessages, localeFromRequest } from "@noo/lib/i18n";
import { redirect, type Params } from "react-router";
import { getSession } from "./lib/session";
import { getUserProfile } from "./lib/userProfile";

export async function resolveLocale(request: Request, params: Params) {
  // First check from the user session
  const session = await loadUserSession(request, params);
  if (session) {
    return session.user.locale;
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

  const nooSession = activeSessions[userIdx];
  const userProfile = await getUserProfile(nooSession);
  if (!userProfile) {
    return;
  }

  return { user: userProfile };
}
