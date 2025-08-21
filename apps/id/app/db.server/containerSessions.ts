import { and, eq, SQL } from "drizzle-orm";
import { schema, type DbCtx } from ".";
import {
  destroyUpToOne,
  findOneOrNotFound,
  handleDriverErrors,
  updateOne,
  type RecordShape,
} from "./utils";
import { useDbCtx } from "./repository";

export const makeContainerSessionsRepository = (dbc?: DbCtx) => {
  const getDbc = () => dbc ?? useDbCtx();

  const find = (containerSessionId: string) =>
    findOneOrNotFound(
      getDbc().query.containerSessions.findFirst({
        where: eq(schema.containerSessions.id, containerSessionId),
        with: { sessions: { with: { user: { with: { tenant: true } } } } },
      }),
    );

  const select = (conditions: SQL) =>
    handleDriverErrors(
      getDbc().query.containerSessions.findMany({
        where: conditions,
        with: { sessions: { with: { user: { with: { tenant: true } } } } },
      }),
    );

  const create = (attributes: typeof schema.containerSessions.$inferInsert) =>
    handleDriverErrors(
      getDbc()
        .insert(schema.containerSessions)
        .values({
          id: crypto.randomUUID(),
          version: 0,
          lastUsedAt: new Date(),
          ...attributes,
        })
        .returning()
        .then((rows) => ({ ...rows[0], sessions: [] })),
    );

  const refresh = (
    containerSessionId: string,
    verifierDigest: string,
    expectedVersion: number,
  ) =>
    updateOne(
      getDbc()
        .update(schema.containerSessions)
        .set({
          lastUsedAt: new Date(),
          verifierDigest,
          version: expectedVersion + 1,
        })
        .where(
          and(
            eq(schema.containerSessions.id, containerSessionId),
            eq(schema.containerSessions.version, expectedVersion),
          ),
        )
        .returning(),
    ).map((record) => ({ ...record, sessions: [] }));

  const destroy = (containerSessionId: string) =>
    destroyUpToOne(
      getDbc()
        .delete(schema.containerSessions)
        .where(eq(schema.containerSessions.id, containerSessionId))
        .returning(),
    );

  return {
    find,
    select,
    create,
    destroy,
    refresh,
  };
};

export type ContainerSessionsRepo = ReturnType<
  typeof makeContainerSessionsRepository
>;
export type ContainerSession = RecordShape<ContainerSessionsRepo, "find">;
