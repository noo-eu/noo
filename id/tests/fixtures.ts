import db from "@/db";
import * as schema from "@/db/schema";
import { createTenant } from "@/db/tenants";
import { createUser } from "@/db/users";
import { reset } from "drizzle-seed";

async function main() {
  await reset(db, schema);

  await createUser({
    username: "jo.Hn.doE1",
    normalizedUsername: "johndoe1",
    firstName: "John",
    lastName: "Doe",
    // super-s3cr3t
    passwordDigest:
      "$argon2id$v=19$m=65536,t=3,p=4$9TQmMdbZltXuRxsUSrrOEw$b4iWu+Qcc9WybZYKLnw14LSM6D5IJ9oks6LHj8jqD9M",
  });

  await createTenant({
    name: "Acme Sarl",
    domain: "acme.fr",
    // yzS-Cx1NFjQlRFiUem8B6zn3S63-kq_XCBnXcoV5YYE
    oidcRegistrationTokenDigest:
      "$sha256$s2v0ZvQHg1lsMverSjEk8w$BUMTAlEObGAlkWQQ1rnDrrUcD2kbvCN9i0Of3DwXM2A",
  });
}

main().then(() => {
  process.exit(0);
});
