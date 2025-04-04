import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "~/db";

export default defineConfig({
  out: "./drizzle",
  schema: "./app/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
