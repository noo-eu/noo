import { errAsync, okAsync, ResultAsync } from "neverthrow";
import db, { type DbCtx } from ".";
import { makeContainerSessionsRepository } from "./containerSessions";
import { makeSessionsRepository } from "./sessions";
import type { RepositoryError } from "./utils";

export const makeRepository = (dbc: DbCtx) => ({
  containerSessions: makeContainerSessionsRepository(dbc),
  sessions: makeSessionsRepository(dbc),
  afterCommit: (_: PostCommit<any>): void => {
    throw new Error("afterCommit invoked outside of transaction");
  },
});

export default makeRepository(db);
export type Repository = ReturnType<typeof makeRepository>;

type PostCommit<E> =
  | (() => ResultAsync<void, E>)
  | (() => Promise<void>)
  | (() => void);

const normalizePostCommit = <E>(cb: PostCommit<E>): ResultAsync<void, E> => {
  try {
    const r = cb();

    if (!r) {
      // void
      return okAsync<void, E>(undefined);
    }

    // ResultAsync
    if (typeof (r as any).andThen === "function") {
      return r as ResultAsync<void, E>;
    }

    // Promise
    return ResultAsync.fromPromise(r as Promise<void>, (e) => e as E);
  } catch (e) {
    return errAsync<void, E>(e as E);
  }
};

export function withTransaction<T, E>(
  fn: (repo: ReturnType<typeof makeRepository>) => ResultAsync<T, E>,
): ResultAsync<T, E | RepositoryError> {
  let err: E | undefined = undefined;
  const queue: PostCommit<E>[] = [];

  const txResult = ResultAsync.fromPromise(
    db.transaction(async (tx) => {
      const repo = makeRepository(tx);
      repo.afterCommit = (fn: PostCommit<E>) => {
        queue.push(fn);
      };

      const result = await fn(repo);
      if (result.isErr()) {
        err = result.error;
        tx.rollback();
      }

      return result._unsafeUnwrap();
    }),
    (ex) => {
      if (err) {
        return err;
      }
      return {
        code: "DB_DRIVER_ERROR" as const,
        message: "Transaction failed",
        cause: ex,
      };
    },
  );

  return queue.reduce<ResultAsync<T, E | RepositoryError>>(
    (acc, cb) =>
      acc.andThrough(() =>
        normalizePostCommit(cb).mapErr<E | RepositoryError>((e) => e),
      ),
    txResult,
  );
}
