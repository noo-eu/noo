import { humanIdToUuid } from "@noo/lib/humanIds";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import repository, { type Repository } from "~/db.server/repository";
import type { Session } from "~/db.server/sessions";
import type { UserWithTenant } from "~/db.server/users.server";
import { loadContainerSession } from "./container";
import type { SessionError } from "./errors";

export function getActiveSessions(
  request: Request,
  maxAgeSeconds?: number,
  tx?: Repository,
): ResultAsync<Session[], SessionError> {
  return loadContainerSession(tx ?? repository, request)
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

function normalizeUserId(userId?: string): string | undefined {
  if (userId?.startsWith("usr_")) {
    return humanIdToUuid(userId, "usr");
  }

  return userId;
}
