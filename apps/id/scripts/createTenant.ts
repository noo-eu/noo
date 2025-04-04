import { uuidToHumanId } from "@noo/lib/humanIds";
import Tenants from "~/db.server/tenants";

if (process.argv.length < 3 || process.argv.length > 4) {
  console.log("Usage: pnpm tsx ./scripts/createTenant.ts <name> [<domain>]");
  console.log(
    "Example: pnpm tsx ./scripts/createTenant.ts 'Acme Sarl' 'acme.fr'",
  );
  process.exit(1);
}

const name = process.argv[2];
const domain = process.argv[3];

const tenant = await Tenants.create({
  name,
  domain,
});

console.log(`Tenant ${name} created.`);
console.log(`Tenant ID: ${uuidToHumanId(tenant.id, "org")}`);
console.log(`Tenant domain: ${domain}`);

process.exit(0);
