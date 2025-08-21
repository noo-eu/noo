import { DrizzleQueryError } from "drizzle-orm/errors";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

export type RepositoryError =
  | { code: "DB_DRIVER_ERROR"; message: string; cause?: unknown }
  | { code: "DB_RECORD_NOT_FOUND"; message: string; cause?: unknown };

export type DatabaseResult<T> = ResultAsync<T, RepositoryError>;

export type OkType<R> = R extends DatabaseResult<infer T> ? T : never;

export function fromDatabasePromise<T>(promise: Promise<T>): DatabaseResult<T> {
  return ResultAsync.fromPromise(promise, (e) => {
    if (e instanceof DrizzleQueryError) {
      return {
        code: "DB_DRIVER_ERROR" as const,
        message: e.message,
        cause: e.cause,
      };
    }

    throw e;
  });
}

export function findOneOrNotFound<T>(
  query: Promise<T | undefined>,
): DatabaseResult<T> {
  return fromDatabasePromise(query).andThen((row) =>
    row
      ? okAsync(row)
      : errAsync({
          code: "DB_RECORD_NOT_FOUND" as const,
          message: "Record not found",
        }),
  );
}
