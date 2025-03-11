import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { existsSync } from "fs";
import * as schema from "./schema";

let DATABASE_NAME = "noo_id";
if (process.env.TEST === "1" || process.env.NODE_ENV === "test") {
  DATABASE_NAME = "noo_id_test";
}

if (!process.env.DATABASE_URL) {
  /**
   * Attempt at a seamless development experience.
   *
   * node-postgres uses TCP connections, even when connecting to localhost.
   * That will require a password to be set for the user.
   *
   * To avoid that, we can use a UNIX socket connection. However, the PostgreSQL
   * socket location is different on different systems.
   *
   * - @francescobbo
   */
  const candidateSockets = [
    "/var/run/postgresql/.s.PGSQL.5432",
    "/tmp/.s.PGSQL.5432",
    "/usr/local/var/postgres/.s.PGSQL.5432",
  ];

  const socket = candidateSockets.find((socket) => existsSync(socket));
  if (socket) {
    // Strip the filename from the socket path.
    const socketDir = socket.split("/").slice(0, -1).join("/");
    process.env.DATABASE_URL = `postgresql:///${DATABASE_NAME}?host=${socketDir}`;
  } else {
    throw new Error("DATABASE_URL is not set and no PostgreSQL socket found.");
  }
}

const databaseUrl = process.env.DATABASE_URL;
export { databaseUrl, schema };

const client = drizzle(databaseUrl, { schema });
/* await (causes all sorts of ESM problems */ client.execute(
  sql`SET TIME ZONE 'UTC';`,
);

export default client;
