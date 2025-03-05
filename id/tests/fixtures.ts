import db from "@/db";
import { createOidcClient } from "@/db/oidc_clients";
import * as schema from "@/db/schema";
import { createTenant } from "@/db/tenants";
import { createUser } from "@/db/users";
import { reset } from "drizzle-seed";

async function main() {
  await reset(db, schema);

  await createUser({
    id: "00000000-0000-0000-0000-000000000001",
    username: "jo.Hn.doE1",
    normalizedUsername: "johndoe1",
    firstName: "John",
    lastName: "Doe",
    // super-s3cr3t
    passwordDigest:
      "$argon2id$v=19$m=65536,t=3,p=4$9TQmMdbZltXuRxsUSrrOEw$b4iWu+Qcc9WybZYKLnw14LSM6D5IJ9oks6LHj8jqD9M",
  });

  const tenant = await createTenant({
    name: "Acme Sarl",
    domain: "acme.fr",
    // yzS-Cx1NFjQlRFiUem8B6zn3S63-kq_XCBnXcoV5YYE
    oidcRegistrationTokenDigest:
      "$sha256$s2v0ZvQHg1lsMverSjEk8w$BUMTAlEObGAlkWQQ1rnDrrUcD2kbvCN9i0Of3DwXM2A",
  });

  // Public OIDC Client (not scoped to any tenant)
  await createOidcClient({
    id: "00000000-0000-0000-0000-000000000001",
    clientName: { "": "Test Public OIDC Client" },
    clientSecret: "super-s3cret",
    redirectUris: ["https://localhost:22999/cb"],
    subjectType: "pairwise",
    grantTypes: ["authorization_code"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "client_secret_basic",
  });

  // Tenant OIDC Client
  await createOidcClient({
    id: "00000000-0000-0000-0000-000000000002",
    tenantId: tenant.id,
    clientName: { "": "Acme Sarl's app" },
    clientSecret: "super-s3cret",
    redirectUris: ["https://localhost:22999/cb"],
    subjectType: "pairwise",
    grantTypes: ["authorization_code"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "client_secret_basic",
  });
}

main().then(() => {
  process.exit(0);
});
