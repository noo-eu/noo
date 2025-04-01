import Sessions from "@/db/sessions";
import { checkSessionToken, createSessionToken } from "@noo/lib/session";
import { cookies } from "next/headers";

export async function startSession(
  authenticatedSessions: {
    userId: string;
    sessionId: string;
  }[],
) {
  const { sessionId, verifierDigest, token } = createSessionToken();

  await Sessions.create({
    id: sessionId,
    verifierDigest,
    sessionData: {
      authenticatedSessions,
    },
  });

  await setSessionCookie(token);
}

export async function getCurrentSession() {
  const session = await checkSessionToken(
    await getSessionCookie(),
    Sessions.find,
  );
  if (!session) {
    return undefined;
  }

  return session;
}

export const SESSION_COOKIE = "_noo_mail_auth";

async function setSessionCookie(cookie: string) {
  const store = await cookies();

  await store.set(SESSION_COOKIE, cookie, {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE)?.value ?? "";

  return cookieValue;
}
