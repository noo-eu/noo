import { eq } from "drizzle-orm";
import db, { schema } from ".";

async function find(passkeyChallengeId: string) {
  return db.query.passkeyChallenges.findFirst({
    where: eq(schema.passkeyChallenges.id, passkeyChallengeId),
  });
}

async function create(
  attributes: typeof schema.passkeyChallenges.$inferInsert,
) {
  return (
    await db.insert(schema.passkeyChallenges).values(attributes).returning()
  ).pop()!;
}

async function destroy(passkeyChallengeId: string) {
  return db
    .delete(schema.passkeyChallenges)
    .where(eq(schema.passkeyChallenges.id, passkeyChallengeId));
}

const PasskeyChallenges = {
  find,
  create,
  destroy,
};

export default PasskeyChallenges;
export type PasskeyChallenge = typeof schema.passkeyChallenges.$inferSelect;
