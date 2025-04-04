import { reset } from "drizzle-seed";
import db from "~/db.server";
import OidcClients from "~/db.server/oidc_clients";
import * as schema from "~/db.server/schema";
import Tenants from "~/db.server/tenants";
import Users from "~/db.server/users.server";

async function main() {
  await reset(db, schema);

  await Users.create({
    id: "00000000-0000-0000-0000-000000000001",
    username: "jo.Hn.doE1",
    normalizedUsername: "johndoe1",
    firstName: "John",
    lastName: "Doe",
    // super-s3cr3t
    passwordDigest:
      "$argon2id$v=19$m=65536,t=3,p=4$9TQmMdbZltXuRxsUSrrOEw$b4iWu+Qcc9WybZYKLnw14LSM6D5IJ9oks6LHj8jqD9M",
  });

  const tenant = await Tenants.create({
    id: "00000000-0000-0000-0000-000000000001",
    name: "Acme Sarl",
    domain: "acme.fr",
    // yzS-Cx1NFjQlRFiUem8B6zn3S63-kq_XCBnXcoV5YYE
    oidcRegistrationTokenDigest:
      "$sha256$s2v0ZvQHg1lsMverSjEk8w$BUMTAlEObGAlkWQQ1rnDrrUcD2kbvCN9i0Of3DwXM2A",
  });

  // Public OIDC Client (not scoped to any tenant)
  await OidcClients.create({
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
  await OidcClients.create({
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
