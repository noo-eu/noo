import {
  inet,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  domain: text().unique().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    username: text().notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    passwordDigest: text("password_digest"),
    otpSecret: text("otp_secret"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
  },
  (table) => [
    unique("users_tenant_id_normalized_username")
      .on(table.tenantId, table.normalizedUsername)
      .nullsNotDistinct(),
  ],
);

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  verifierDigest: text("verifier_digest").notNull(),
  ip: inet().notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
});
