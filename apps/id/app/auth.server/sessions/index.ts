import { humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { checkVerifier, createVerifier } from "@noo/lib/verifier";
import { eq } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { schema } from "~/db.server";
import { type ContainerSession } from "~/db.server/containerSessions";
import repository, {
  withTransaction,
  type Repository,
} from "~/db.server/repository";
import { type Session } from "~/db.server/sessions";
import { type UserWithTenant } from "~/db.server/users.server";
import type { RepositoryError, RepositoryErrorCode } from "~/db.server/utils";
import { liftError, type ErrorEnvelope } from "~/lib.server/errors";
import { getClientIp } from "~/lib.server/http";
import {
  clearAuthCookies,
  getSessionCookie,
  writeSessionCookies,
} from "./store";
import { decodeSessionToken, encodeSessionToken } from "./token";

export type SessionErrorCode =
  | "ARGUMENT_ERROR"
  | "INVALID_SESSION"
  | "NO_SESSION"
  | "STORAGE_ERROR";

export type SessionError = ErrorEnvelope<SessionErrorCode>;

function loadContainerSession(
  tx: Repository,
  request: Request,
): ResultAsync<ContainerSession, SessionError> {
  return getSessionCookie(request)
    .andThen(decodeSessionToken)
    .andThen(({ sid, verifier }) =>
      tx.containerSessions
        .find(sid)
        .mapErr(repoToSession)
        .map((container) => ({
          container,
          verifier,
        })),
    )
    .andThen(({ container, verifier }) => verifySession(container, verifier));
}

function startContainerSession(tx: Repository, jar: Headers) {
  const sid = crypto.randomUUID();
  const { verifier, digest } = createVerifier();

  return tx.containerSessions
    .create({
      id: sid,
      verifierDigest: digest,
      version: 0,
      lastUsedAt: new Date(),
    })
    .mapErr(repoToSession)
    .andTee(() => {
      tx.afterCommit(() =>
        writeSessionCookies(jar, encodeSessionToken({ sid, verifier }), 0),
      );
    });
}

function rotateContainer(
  tx: Repository,
  container: ContainerSession,
  jar: Headers,
): ResultAsync<ContainerSession, SessionError> {
  const { verifier, digest } = createVerifier();
  return tx.containerSessions
    .refresh(container.id, digest, container.version)
    .mapErr(repoToSession)
    .andTee((container) => {
      tx.afterCommit(() =>
        writeSessionCookies(
          jar,
          encodeSessionToken({ sid: container.id, verifier }),
          container.version,
        ),
      );
    });
}

function ensureContainerSession(
  tx: Repository,
  request: Request,
  jar: Headers,
) {
  return loadContainerSession(tx, request).orElse(() =>
    startContainerSession(tx, jar),
  );
}

function verifySession(
  session: ContainerSession,
  verifier: string,
): ResultAsync<ContainerSession, SessionError> {
  if (checkVerifier(verifier, session.verifierDigest)) {
    return okAsync(session);
  }

  return errAsync({
    code: "INVALID_SESSION",
    message: "Invalid session verifier",
  });
}

export function createSession(
  request: Request,
  jar: Headers,
  userId: string,
): ResultAsync<Session, SessionError> {
  return withTransaction((tx) =>
    ensureContainerSession(tx, request, jar)
      .andThen((container) => rotateContainer(tx, container, jar))
      .andThen((container) =>
        tx.sessions.create({
          id: crypto.randomUUID(),
          containerSessionId: container.id,
          userId,
          ip: getClientIp(request),
          userAgent: request.headers.get("user-agent") ?? "",
          lastAuthenticatedAt: new Date(),
          lastUsedAt: new Date(),
        }),
      ),
  ).mapErr(repoToSession);
}

export function reauthenticateSession(
  request: Request,
  jar: Headers,
  sid: string,
): ResultAsync<Session, SessionError> {
  return withTransaction((tx) =>
    ensureContainerSession(tx, request, jar)
      .andThen((container) => {
        if (!container.sessions.some((s) => s.id === sid)) {
          return errAsync({
            code: "NO_SESSION" as const,
            message: "Session not found",
            cause: undefined,
          });
        }

        return rotateContainer(tx, container, jar);
      })
      .andThen(() =>
        tx.sessions.refresh(
          sid,
          getClientIp(request),
          request.headers.get("user-agent") ?? "",
          new Date(),
        ),
      ),
  ).mapErr(repoToSession);
}

export function endSession(
  request: Request,
  jar: Headers,
  sid: string,
): ResultAsync<void, SessionError> {
  return withTransaction((tx) =>
    ensureContainerSession(tx, request, jar)
      .andThen((container) => {
        if (!container.sessions.some((s) => s.id === sid)) {
          return errAsync({
            code: "NO_SESSION" as const,
            message: "Session not found",
            cause: undefined,
          });
        }

        return rotateContainer(tx, container, jar);
      })
      .andThrough(() => tx.sessions.destroy(sid))
      .andThen((container) =>
        tx.sessions
          .countBy(eq(schema.sessions.containerSessionId, container.id))
          .andThen((remaining) => {
            if (remaining === 0) {
              return tx.containerSessions.destroy(container.id).andTee(() => {
                tx.afterCommit(() => clearAuthCookies(jar));
              });
            }
            return okAsync();
          }),
      ),
  ).mapErr(repoToSession);
}

export function endAllSessions(
  request: Request,
  jar: Headers,
): ResultAsync<void, SessionError> {
  return withTransaction((tx) =>
    loadContainerSession(tx, request)
      .andThen((container) => tx.containerSessions.destroy(container.id))
      .andTee(() => {
        tx.afterCommit(() => clearAuthCookies(jar));
      }),
  ).mapErr(repoToSession);
}

export function getActiveSessions(
  request: Request,
  maxAge?: number,
  tx?: Repository,
): ResultAsync<Session[], SessionError> {
  return loadContainerSession(tx ?? repository, request)
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
): ResultAsync<UserWithTenant, SessionError> {
  return getAuthenticatedSession(request, userId).map(
    (session) => session.user,
  );
}

export function getAuthenticatedSession(
  request: Request,
  userId: string | undefined,
  tx?: Repository,
): ResultAsync<Session, SessionError> {
  userId = normalizeUserId(userId);
  if (!userId) {
    return errAsync({
      code: "ARGUMENT_ERROR" as const,
      message: "Invalid user ID",
    });
  }

  return loadContainerSession(tx ?? repository, request).andThen(
    (container) => {
      const { sessions } = container;
      const session = sessions.find((s) => s.userId === userId);
      if (!session) {
        return errAsync({
          code: "NO_SESSION" as const,
          message: "Session not found",
          cause: undefined,
        });
      }
      return okAsync(session);
    },
  );
}

export function getFirstAuthenticatedUserId(
  request: Request,
): ResultAsync<string, SessionError> {
  return getActiveSessions(request).andThen((sessions) => {
    const first = sessions[0];
    return first
      ? okAsync(uuidToHumanId(first.userId, "usr"))
      : errAsync({
          code: "NO_SESSION" as const,
          message: "No active session",
          cause: undefined,
        });
  });
}

function normalizeUserId(userId?: string): string | undefined {
  if (userId?.startsWith("usr_")) {
    return humanIdToUuid(userId, "usr");
  }

  return userId;
}

const repoToSession = liftError<RepositoryErrorCode, SessionErrorCode>(
  "session",
  (e) => {
    const err = e as RepositoryError;
    switch (err.code) {
      case "DB_RECORD_NOT_FOUND":
        return { code: "NO_SESSION", message: "Session not found" };
      default:
        return { code: "STORAGE_ERROR", message: "Database error" };
    }
  },
);
