import { humanIdToUuid } from "@noo/lib/humanIds";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { Session } from "~/db.server/sessions";
import type { UserWithTenant } from "~/db.server/users.server";
import { loadContainerSession } from "./container";
import type { SessionError } from "./errors";

/**
 * Return all active sessions for the current container.
 *
 * Loads the container session from the request and optionally filters
 * the contained sessions by their last usage time.
 *
 * @param request - Incoming HTTP request carrying session cookies.
 * @param maxAgeSeconds - Optional maximum session idle age in seconds.
 *   If provided, only sessions used more recently than this threshold
 *   are included.
 * @returns ResultAsync resolving to an array of active sessions,
 *   or a SessionError if loading the container session fails.
 *   Returns an empty array if no container session exists.
 */
export function getActiveSessions(
  request: Request,
  maxAgeSeconds?: number,
): ResultAsync<Session[], SessionError> {
  return loadContainerSession(request)
    .map((container) => {
      if (maxAgeSeconds !== undefined) {
        const now = Date.now();
        return container.sessions.filter((s) => {
          const diff = now - s.lastUsedAt.getTime();
          return diff < maxAgeSeconds * 1000;
        });
      }

      return container.sessions;
    })
    .orElse((e) => (e.code === "NO_SESSION" ? okAsync([]) : errAsync(e)));
}

/**
 * Load the authenticated user object for a request.
 *
 * Delegates to {@link getAuthenticatedSession} and extracts the
 * associated `UserWithTenant` object from the session.
 *
 * @param request - Incoming HTTP request carrying session cookies.
 * @param userId - Expected user identifier (UUID or humanId).
 * @returns ResultAsync resolving to the authenticated user or
 *   a SessionError if no valid session is found.
 */
export function getAuthenticatedUser(
  request: Request,
  userId: string | undefined,
): ResultAsync<UserWithTenant, SessionError> {
  return getAuthenticatedSession(request, userId).map(
    (session) => session.user,
  );
}

/**
 * Load a specific authenticated session by user ID.
 *
 * Normalizes the provided user ID (UUID or humanId), loads the
 * container session, and finds a matching user session inside it.
 *
 * @param request - Incoming HTTP request carrying session cookies.
 * @param userId - Expected user identifier (UUID or humanId).
 * @returns ResultAsync resolving to the matching session,
 *   or a SessionError if the ID is invalid or no session is found.
 */
export function getAuthenticatedSession(
  request: Request,
  userId: string | undefined,
): ResultAsync<Session, SessionError> {
  userId = normalizeUserId(userId);
  if (!userId) {
    return errAsync({
      code: "ARGUMENT_ERROR" as const,
      message: "Invalid user ID",
    });
  }

  return loadContainerSession(request).andThen((container) => {
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
  });
}

function normalizeUserId(userId?: string): string | undefined {
  if (userId?.startsWith("usr_")) {
    return humanIdToUuid(userId, "usr");
  }

  return userId;
}
