import { errAsync, okAsync, ResultAsync } from "neverthrow";
import db, { type DbCtx } from ".";
import { makeContainerSessionsRepository } from "./containerSessions";
import { makeSessionsRepository } from "./sessions";
import type { RepositoryError } from "./utils";
import { AsyncLocalStorage } from "node:async_hooks";

export const makeRepository = (dbc?: DbCtx) => ({
  containerSessions: makeContainerSessionsRepository(dbc),
  sessions: makeSessionsRepository(dbc),
  afterCommit: (_: PostCommit<any>): void => {
    throw new Error("afterCommit invoked outside of transaction");
  },
});

export default makeRepository();
export type Repository = ReturnType<typeof makeRepository>;

type PostCommit<E = unknown> =
  | (() => ResultAsync<void, E>)
  | (() => Promise<void>)
  | (() => void);

type Store = {
  txn: DbCtx;
  queue: PostCommit[];
};

const databaseContext = new AsyncLocalStorage<Store>();

export function inTransaction(): boolean {
  return !!databaseContext.getStore();
}

/**
 * Get the current database context, which may be a deeply nested transaction,
 * or the base Drizzle context.
 *
 * @returns The current database context.
 */
export function useDbCtx(): DbCtx {
  const s = databaseContext.getStore();
  if (!s) {
    return db;
  }

  return s.txn;
}

/**
 * Register a callback to run after the current transaction successfully commits.
 *
 * Accepts callbacks that return void, Promise<void>, or ResultAsync<void, E>.
 * Throws if called outside of a `withTransaction` scope.
 *
 * NOTE: afterCommit callbacks are executed after the outermost transaction
 * commits.
 *
 * @param cb - Post-commit callback to enqueue.
 */
export function afterCommit<E = unknown>(cb: PostCommit<E>): void {
  const s = databaseContext.getStore();
  if (!s) {
    throw new Error("afterCommit invoked outside of transaction");
  }

  s.queue.push(cb);
}

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

/**
 * Run an operation inside a database transaction with AsyncLocalStorage scoping.
 *
 * Exposes the transactional context to repository helpers and executes any
 * `afterCommit` callbacks only once the transaction commits. Propagates driver
 * errors as RepositoryError.
 *
 * @param fn - Function producing a ResultAsync to execute within the transaction.
 * @returns ResultAsync of the function's result or a RepositoryError on failure.
 */
export function withTransaction<T, E>(
  fn: () => ResultAsync<T, E>,
): ResultAsync<T, E | RepositoryError> {
  const parent = databaseContext.getStore();
  const base = parent?.txn ?? db;

  let err: E | undefined = undefined;

  const runOnce = (dbc: DbCtx, queue: PostCommit[]) =>
    ResultAsync.fromPromise(
      dbc.transaction(async (tx) => {
        return await databaseContext.run({ txn: tx, queue }, async () => {
          const result = await fn();
          if (result.isErr()) {
            err = result.error;
            tx.rollback();

            throw new Error("unreachable"); // helps with type inference
          } else {
            return result.value;
          }
        });
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

  if (parent) {
    return runOnce(parent.txn, parent.queue);
  }

  const queue: PostCommit<E | RepositoryError>[] = [];
  const result = runOnce(db, []);

  return queue.reduce<ResultAsync<T, E | RepositoryError>>(
    (acc, cb) =>
      acc.andThrough(() =>
        normalizePostCommit(cb).mapErr<E | RepositoryError>((e) => e),
      ),
    result,
  );
}
