import { DrizzleQueryError } from "drizzle-orm/errors";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { ErrorEnvelope } from "~/lib.server/errors";

export type RepositoryErrorCode =
  | "DB_DRIVER_ERROR"
  | "DB_RECORD_NOT_FOUND"
  | "DB_OPTIMISTIC_UPDATE_FAILED"
  | "DB_UNEXPECTED_DELETE"
  | "DB_UNEXPECTED_UPDATE";

export type RepositoryError = ErrorEnvelope<RepositoryErrorCode>;

export type DatabaseResult<T> = ResultAsync<T, RepositoryError>;

export type RecordShape<TObj, TKey extends keyof TObj> = TObj[TKey] extends (
  ...args: any[]
) => DatabaseResult<infer R>
  ? R
  : never;

export const handleDriverErrors = <T>(promise: Promise<T>): DatabaseResult<T> =>
  ResultAsync.fromPromise(promise, (e) => {
    if (e instanceof DrizzleQueryError) {
      return {
        code: "DB_DRIVER_ERROR" as const,
        message: e.message,
        cause: e.cause,
      };
    }

    return { code: "DB_DRIVER_ERROR", message: "Unknown DB error", cause: e };
  });

const mapNotFound = <T>(value: T | undefined): DatabaseResult<T> =>
  value
    ? okAsync(value)
    : errAsync({
        code: "DB_RECORD_NOT_FOUND" as const,
        message: "Record not found",
      });

const mapNotOne = <T>(rows: T[]): DatabaseResult<T> =>
  rows.length == 0
    ? errAsync({
        code: "DB_OPTIMISTIC_UPDATE_FAILED" as const,
        message: "Nothing was updated. Last known version may be stale.",
        retryable: true,
      })
    : rows.length == 1
      ? okAsync(rows[0])
      : errAsync({
          code: "DB_UNEXPECTED_UPDATE" as const,
          message:
            "An update operation affected multiple rows when only one was expected",
        });

export const findOneOrNotFound = <T>(
  query: Promise<T | undefined>,
): DatabaseResult<T> => handleDriverErrors(query).andThen(mapNotFound);

export const updateOne = <T>(query: Promise<T[]>): DatabaseResult<T> =>
  handleDriverErrors(query).andThen(mapNotOne);

export const destroyUpToOne = <T>(query: Promise<T[]>): DatabaseResult<void> =>
  handleDriverErrors(query).andThen((rows) => {
    if (rows.length < 2) {
      return okAsync();
    }

    return errAsync({
      code: "DB_UNEXPECTED_DELETE" as const,
      message:
        "A delete operation affected multiple rows when only one was expected",
    });
  });
