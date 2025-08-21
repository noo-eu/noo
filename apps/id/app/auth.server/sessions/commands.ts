import { eq } from "drizzle-orm";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { schema } from "~/db.server";
import { withTransaction } from "~/db.server/repository";
import type { Session } from "~/db.server/sessions";
import { getClientIp } from "~/lib.server/http";
import {
  ensureContainerSession,
  loadContainerSession,
  rotateContainerSession,
} from "./container";
import { repoToSession, type SessionError } from "./errors";
import { clearAuthCookies } from "./store";

export function createSession(
  request: Request,
  jar: Headers,
  userId: string,
): ResultAsync<Session, SessionError> {
  return withTransaction((tx) =>
    ensureContainerSession(tx, request, jar)
      .andThen((container) => rotateContainerSession(tx, container, jar))
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
  sessionId: string,
): ResultAsync<Session, SessionError> {
  return withTransaction((tx) =>
    loadContainerSession(tx, request).andThen((container) =>
      tx.sessions
        .refresh(
          container.id,
          sessionId,
          getClientIp(request),
          request.headers.get("user-agent") ?? "",
          new Date(),
        )
        .andThrough(() => rotateContainerSession(tx, container, jar)),
    ),
  ).mapErr(repoToSession);
}

export function endSession(
  request: Request,
  jar: Headers,
  sessionId: string,
): ResultAsync<void, SessionError> {
  return withTransaction((tx) =>
    loadContainerSession(tx, request)
      .andThrough((container) => tx.sessions.destroy(container.id, sessionId))
      .andThen((container) =>
        tx.sessions
          .countBy(eq(schema.sessions.containerSessionId, container.id))
          .andThen((remaining) =>
            remaining === 0
              ? tx.containerSessions.destroy(container.id).andTee(() => {
                  tx.afterCommit(() => clearAuthCookies(jar));
                })
              : rotateContainerSession(tx, container, jar).map(() => undefined),
          ),
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
      })
      .orElse((e) => (e.code === "NO_SESSION" ? okAsync() : errAsync(e))),
  ).mapErr(repoToSession);
}
