import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const domainsTable = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  domain: text().unique().notNull(),
});

export const usersTable = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => domainsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    username: text().notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    passwordDigest: text("password_digest"),
    otpSecret: text("otp_secret"),
  },
  (table) => [
    uniqueIndex("users_tenant_id_normalized_username").on(
      table.tenantId,
      table.normalizedUsername,
    ),
  ],
);
