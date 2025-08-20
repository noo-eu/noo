import { humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { checkVerifier, createVerifier } from "@noo/lib/verifier";
import {
  err,
  errAsync,
  ok,
  okAsync,
  ResultAsync,
  type Result,
} from "neverthrow";
import ContainerSessions, {
  type ContainerSession,
} from "~/db.server/containerSessions";
import Sessions, { type Session } from "~/db.server/sessions";
import { type UserWithTenant } from "~/db.server/users.server";
import { getClientIp } from "~/lib.server/http";
import { sessionCookie, setSessionCookie } from "./store";
import { decodeSessionToken, encodeSessionToken } from "./token";

export function getSessionCookie(
  request: Request,
): ResultAsync<string, string> {
  return ResultAsync.fromPromise(
    sessionCookie.parse(request.headers.get("cookie")),
    () => "BAD_COOKIE",
  ).andThen((cookie) => (cookie ? okAsync(cookie) : errAsync("NO_COOKIE")));
}

export function loadContainerSession(
  request: Request,
): ResultAsync<ContainerSession, string> {
  return getSessionCookie(request)
    .andThen(decodeSessionToken)
    .andThen(({ sid, verifier }) =>
      ContainerSessions.find(sid).map((container) => ({
        container,
        verifier,
      })),
    )
    .andThen(({ container, verifier }) => verifySession(container, verifier));
}

export function startContainerSession() {
  const sid = crypto.randomUUID();
  const { verifier, digest } = createVerifier();

  return ContainerSessions.create({
    id: sid,
    verifierDigest: digest,
    lastUsedAt: new Date(),
  }).andTee(() => setSessionCookie(encodeSessionToken({ sid, verifier })));
}

function ensureContainerSession(request: Request) {
  return loadContainerSession(request).orElse(startContainerSession);
}

function verifySession(
  session: ContainerSession,
  verifier: string,
): Result<ContainerSession, string> {
  if (checkVerifier(verifier, session.verifierDigest)) {
    return ok(session);
  }

  return err("Invalid session verifier. Tampered?");
}

export function createSession(request: Request, userId: string) {
  return ensureContainerSession(request).andThen((container) =>
    Sessions.create({
      id: crypto.randomUUID(),
      containerSessionId: container.id,
      userId,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
      lastAuthenticatedAt: new Date(),
      lastUsedAt: new Date(),
    }),
  );
}

export function reauthenticateSession(request: Request, sid: string) {
  return ensureContainerSession(request).andThen((container) => {
    if (!container.sessions.some((s) => s.id === sid)) {
      return errAsync("Session not found");
    }

    return Sessions.refresh(
      sid,
      getClientIp(request),
      request.headers.get("user-agent") ?? "",
      new Date(),
    );
  });
}

export function endSession(request: Request, sid: string) {
  return ensureContainerSession(request).andThen((container) => {
    if (!container.sessions.some((s) => s.id === sid)) {
      return errAsync("Session not found");
    }

    return Sessions.destroy(sid);
  });
}

export function endAllSessions(request: Request) {
  return loadContainerSession(request).andThen((container) =>
    ContainerSessions.destroy(container.id),
  );
}

export function getActiveSessions(
  request: Request,
  maxAge?: number,
): ResultAsync<Session[], never> {
  return loadContainerSession(request)
    .map((container) => {
      if (maxAge !== undefined) {
        const now = new Date();
        return container.sessions.filter((s) => {
          const diff = now.getTime() - s.lastUsedAt.getTime();
          return diff < maxAge * 1000;
        });
      }

      return container.sessions;
    })
    .orElse(() => okAsync([]));
}

export function getAuthenticatedUser(
  request: Request,
  userId: string | undefined,
): ResultAsync<UserWithTenant | undefined, string> {
  return getAuthenticatedSession(request, userId).map(
    (session) => session.user,
  );
}

export function getAuthenticatedSession(
  request: Request,
  userId: string | undefined,
): ResultAsync<Session, string> {
  userId = normalizeUserId(userId);
  if (!userId) {
    return errAsync("Invalid user ID");
  }

  return loadContainerSession(request).andThen((container) => {
    const { sessions } = container;
    const session = sessions.find((s) => s.userId === userId);
    if (!session) {
      return errAsync("Session not found");
    }
    return okAsync(session);
  });
}

export function getFirstAuthenticatedUserId(request: Request) {
  return getActiveSessions(request).andThen((sessions) => {
    const first = sessions[0];
    return first
      ? okAsync(uuidToHumanId(first.userId, "usr"))
      : errAsync("No active session");
  });
}

function normalizeUserId(userId?: string): string | undefined {
  if (userId?.startsWith("usr_")) {
    return humanIdToUuid(userId, "usr");
  }

  return userId;
}
