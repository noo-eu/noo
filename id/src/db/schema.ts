import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

export const domains = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  domain: text().unique().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => domains.id, {
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
