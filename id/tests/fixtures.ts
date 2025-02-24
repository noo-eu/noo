import db from "@/db";
import * as schema from "@/db/schema";
import { reset } from "drizzle-seed";

async function main() {
  await reset(db, schema);

  await db.insert(schema.users).values({
    username: "jo.Hn.doE1",
    normalizedUsername: "johndoe1",
    firstName: "John",
    lastName: "Doe",
    passwordDigest:
      "$argon2id$v=19$m=65536,t=3,p=4$9TQmMdbZltXuRxsUSrrOEw$b4iWu+Qcc9WybZYKLnw14LSM6D5IJ9oks6LHj8jqD9M",
  });
}

main();
