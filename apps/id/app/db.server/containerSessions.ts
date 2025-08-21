import { eq, SQL } from "drizzle-orm";
import db, { schema } from ".";
import { findOneOrNotFound, fromDatabasePromise, type OkType } from "./utils";

function find(containerSessionId: string) {
  return findOneOrNotFound(
    db.query.containerSessions.findFirst({
      where: eq(schema.containerSessions.id, containerSessionId),
      with: { sessions: { with: { user: { with: { tenant: true } } } } },
    }),
  );
}

const select = (conditions: SQL) => {
  fromDatabasePromise(
    db.query.containerSessions.findMany({
      where: conditions,
      with: { sessions: { with: { user: { with: { tenant: true } } } } },
    }),
  );
};

const create = (attributes: typeof schema.containerSessions.$inferInsert) => {
  fromDatabasePromise(
    db
      .insert(schema.containerSessions)
      .values(attributes)
      .returning()
      .then((rows) => ({ ...rows[0], sessions: [] })),
  );
};

const refresh = (
  containerSessionId: string,
  verifierDigest: string,
  version: number,
) => {
  fromDatabasePromise(
    db
      .update(schema.containerSessions)
      .set({
        lastUsedAt: new Date(),
        verifierDigest,
        version,
      })
      .where(eq(schema.containerSessions.id, containerSessionId)),
  );
};

const destroy = (containerSessionId: string) => {
  fromDatabasePromise(
    db
      .delete(schema.containerSessions)
      .where(eq(schema.containerSessions.id, containerSessionId)),
  );
};

const ContainerSessions = {
  find,
  select,
  create,
  destroy,
  refresh,
};

export default ContainerSessions;
export type ContainerSession = Awaited<
  OkType<ReturnType<typeof ContainerSessions.find>>
>;
