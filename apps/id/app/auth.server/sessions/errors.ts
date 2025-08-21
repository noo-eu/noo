import type { RepositoryError, RepositoryErrorCode } from "~/db.server/utils";
import { type ErrorEnvelope, liftError } from "~/lib.server/errors";

export type SessionErrorCode =
  | "ARGUMENT_ERROR"
  | "NO_SESSION"
  | "STORAGE_ERROR";

export type SessionError = ErrorEnvelope<SessionErrorCode>;

export const repoToSession = liftError<RepositoryErrorCode, SessionErrorCode>(
  "session",
  (e) => {
    const err = e as RepositoryError;
    switch (err.code) {
      case "DB_RECORD_NOT_FOUND":
        return { code: "NO_SESSION", message: "Session not found" };
      default:
        return { code: "STORAGE_ERROR", message: "Database error", cause: err };
    }
  },
);
