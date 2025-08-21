import { humanIdToUuid } from "@noo/lib/humanIds";
import { and, count, eq, SQL } from "drizzle-orm";
import { schema, type DbCtx } from ".";
import {
  destroyUpToOne,
  findOneOrNotFound,
  handleDriverErrors,
  updateOne,
  type RecordShape,
} from "./utils";

export const makeSessionsRepository = (dbc: DbCtx) => {
  const find = (sessionId: string) =>
    findOneOrNotFound(
      dbc.query.sessions.findFirst({
        where: eq(schema.sessions.id, sessionId),
        with: { user: { with: { tenant: true } } },
      }),
    );

  const findManyBy = (conditions: SQL) =>
    dbc.query.sessions.findMany({
      where: conditions,
      with: { user: { with: { tenant: true } } },
    });

  const countBy = (conditions: SQL) =>
    handleDriverErrors(
      dbc
        .select({ count: count() })
        .from(schema.sessions)
        .where(conditions)
        .then((rows) => rows[0].count),
    );

  const select = (conditions: SQL) =>
    dbc.query.sessions.findMany({
      where: conditions,
      with: { user: { with: { tenant: true } } },
    });

  const create = (attributes: typeof schema.sessions.$inferInsert) =>
    handleDriverErrors(
      dbc
        .insert(schema.sessions)
        .values(attributes)
        .returning()
        .then((rows) => rows[0]),
    ).andThen((session) => find(session.id));

  const refresh = (
    containerId: string,
    sessionId: string,
    ip: string,
    userAgent: string,
    authenticatedAt?: Date,
  ) =>
    updateOne(
      dbc
        .update(schema.sessions)
        .set({
          ip,
          userAgent,
          lastUsedAt: new Date(),
          lastAuthenticatedAt: authenticatedAt,
        })
        .where(
          and(
            eq(schema.sessions.containerSessionId, containerId),
            eq(schema.sessions.id, sessionId),
          ),
        )
        .returning(),
    ).andThen(() => find(sessionId));

  const destroy = (containerId: string, sessionId: string) => {
    if (sessionId.startsWith("sess_")) {
      sessionId = humanIdToUuid(sessionId, "sess")!;
    }

    return destroyUpToOne(
      dbc
        .delete(schema.sessions)
        .where(
          and(
            eq(schema.sessions.containerSessionId, containerId),
            eq(schema.sessions.id, sessionId),
          ),
        )
        .returning(),
    );
  };

  const destroyBy = (conditions: SQL) =>
    dbc.delete(schema.sessions).where(conditions);

  return {
    find,
    findManyBy,
    countBy,
    select,
    create,
    destroy,
    destroyBy,
    refresh,
  };
};

export type SessionsRepo = ReturnType<typeof makeSessionsRepository>;
export type Session = RecordShape<SessionsRepo, "find">;
