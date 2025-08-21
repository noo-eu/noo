import { eq } from "drizzle-orm";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { schema } from "~/db.server";
import repository, {
  afterCommit,
  withTransaction,
} from "~/db.server/repository";
import type { Session } from "~/db.server/sessions";
import { getClientIp } from "~/lib.server/http";
import {
  ensureContainerSession,
  loadContainerSession,
  rotateContainerSession,
} from "./container";
import { repoToSession, type SessionError } from "./errors";
import { clearAuthCookies } from "./store";

/**
 * Create a brand-new user session tied to a container session.
 *
 * Ensures there is a container session, rotates its verifier, and persists a
 * new user session row with metadata (IP, user-agent, timestamps).
 * Also schedules cookie updates after commit.
 *
 * @param request - Incoming HTTP request (used for IP, headers, cookies).
 * @param jar - Headers object to which Set-Cookie values will be appended.
 * @param userId - Identifier of the authenticated user.
 * @returns ResultAsync resolving to the created session or a SessionError.
 */
export function createSession(
  request: Request,
  jar: Headers,
  userId: string,
): ResultAsync<Session, SessionError> {
  return withTransaction(() =>
    ensureContainerSession(request, jar)
      .andThen((container) => rotateContainerSession(container, jar))
      .andThen((container) =>
        repository.sessions.create({
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

/**
 * Re-authenticate an existing user session.
 *
 * Validates the container session, refreshes the given session record
 * (updating IP, user-agent, and last-used timestamp), and rotates the container
 * verifier to issue new cookies.
 *
 * @param request - Incoming HTTP request containing session cookies.
 * @param jar - Headers object to which Set-Cookie values will be appended.
 * @param sessionId - Identifier of the session to refresh.
 * @returns ResultAsync resolving to the updated session or a SessionError.
 */
export function reauthenticateSession(
  request: Request,
  jar: Headers,
  sessionId: string,
): ResultAsync<Session, SessionError> {
  return withTransaction(() =>
    loadContainerSession(request).andThen((container) =>
      repository.sessions
        .refresh(
          container.id,
          sessionId,
          getClientIp(request),
          request.headers.get("user-agent") ?? "",
          new Date(),
        )
        .andThrough(() => rotateContainerSession(container, jar)),
    ),
  ).mapErr(repoToSession);
}

/**
 * End a single user session.
 *
 * Validates the container session and deletes the specified session record.
 * If it was the last session in the container, also destroys the container
 * session and clears cookies after commit. Otherwise, rotates the verifier
 * and refreshes cookies.
 *
 * @param request - Incoming HTTP request containing session cookies.
 * @param jar - Headers object to which Set-Cookie values will be appended.
 * @param sessionId - Identifier of the session to terminate.
 * @returns ResultAsync<void, SessionError>.
 */
export function endSession(
  request: Request,
  jar: Headers,
  sessionId: string,
): ResultAsync<void, SessionError> {
  return withTransaction(() =>
    loadContainerSession(request)
      .andThrough((container) =>
        repository.sessions.destroy(container.id, sessionId),
      )
      .andThen((container) =>
        repository.sessions
          .countBy(eq(schema.sessions.containerSessionId, container.id))
          .andThen((remaining) =>
            remaining === 0
              ? repository.containerSessions
                  .destroy(container.id)
                  .andTee(() => {
                    afterCommit(() => clearAuthCookies(jar));
                  })
              : rotateContainerSession(container, jar).map(() => undefined),
          ),
      ),
  ).mapErr(repoToSession);
}

/**
 * End all user sessions within the current container.
 *
 * Validates the container session, destroys the container session and all its
 * child sessions, and schedules cookie clearing after commit.
 * If no container session exists, resolves successfully.
 *
 * @param request - Incoming HTTP request containing session cookies.
 * @param jar - Headers object to which Set-Cookie values will be appended.
 * @returns ResultAsync<void, SessionError>.
 */
export function endAllSessions(
  request: Request,
  jar: Headers,
): ResultAsync<void, SessionError> {
  return withTransaction(() =>
    loadContainerSession(request)
      .andThen((container) =>
        repository.containerSessions.destroy(container.id),
      )
      .andTee(() => {
        afterCommit(() => clearAuthCookies(jar));
      })
      .orElse((e) => (e.code === "NO_SESSION" ? okAsync() : errAsync(e))),
  ).mapErr(repoToSession);
}
