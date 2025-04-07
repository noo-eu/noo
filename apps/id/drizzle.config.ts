import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "~/db.server";

export default defineConfig({
  out: "./drizzle",
  schema: "./app/db.server/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
