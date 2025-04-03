import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  verifierDigest: text("verifier_digest").notNull(),
  sessionData: jsonb("session_data").notNull().$type<{
    authenticatedSessions: {
      userId: string;
      sessionId: string;
    }[];
  }>(),
  lastSeenAt: timestamp("last_used_at").notNull().defaultNow(),
});
