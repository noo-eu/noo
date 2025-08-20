import { humanIdToUuid } from "@noo/lib/humanIds";
import { eq, SQL } from "drizzle-orm";
import { err, ok, ResultAsync } from "neverthrow";
import db, { schema } from ".";

export function findOneOrNotFound<T>(
  query: Promise<T | undefined>,
): ResultAsync<T, "NOT_FOUND"> {
  return ResultAsync.fromPromise(query, (e) => {
    throw e;
  }).andThen((row) => (row ? ok(row) : err("NOT_FOUND" as const)));
}

function find(containerSessionId: string) {
  return findOneOrNotFound(
    db.query.containerSessions.findFirst({
      where: eq(schema.containerSessions.id, containerSessionId),
      with: { sessions: { with: { user: { with: { tenant: true } } } } },
    }),
  );
}

async function select(conditions: SQL) {
  return db.query.containerSessions.findMany({
    where: conditions,
    with: { sessions: { with: { user: { with: { tenant: true } } } } },
  });
}

function create(attributes: typeof schema.containerSessions.$inferInsert) {
  return ResultAsync.fromPromise(
    db
      .insert(schema.containerSessions)
      .values(attributes)
      .returning()
      .then((rows) => ({ ...rows[0], sessions: [] })),
    (e) => {
      throw e;
    },
  );
}

function refresh(containerSessionId: string) {
  return db
    .update(schema.containerSessions)
    .set({
      lastUsedAt: new Date(),
    })
    .where(eq(schema.containerSessions.id, containerSessionId));
}

function destroy(containerSessionId: string) {
  if (containerSessionId.startsWith("csess_")) {
    containerSessionId = humanIdToUuid(containerSessionId, "csess")!;
  }

  return ResultAsync.fromPromise(
    db
      .delete(schema.containerSessions)
      .where(eq(schema.containerSessions.id, containerSessionId)),
    (e) => {
      throw e;
    },
  );
}

const ContainerSessions = {
  find,
  select,
  create,
  destroy,
  refresh,
};

type OkType<R> = R extends ResultAsync<infer T, unknown> ? T : never;

export default ContainerSessions;
export type ContainerSession = Awaited<
  OkType<ReturnType<typeof ContainerSessions.find>>
>;
