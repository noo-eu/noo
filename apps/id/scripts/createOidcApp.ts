import OidcClients from "@/db/oidc_clients";
import { uuidToHumanId } from "@/utils";
import { randomBytes } from "crypto";

if (process.argv.length !== 4) {
  console.log("Usage: bun run ./scripts/createOidcApp.ts <name> <redirectUri>");
  console.log(
    "Example: bun run ./scripts/createOidcApp.ts 'My App' 'https://example.com/callback'",
  );
  process.exit(1);
}

const name = process.argv[2];
const redirectUri = process.argv[3];
const secret = "oidc_s_" + randomBytes(48).toString("base64url");

const client = await OidcClients.create({
  clientName: { "": name },
  clientSecret: secret,
  redirectUris: [redirectUri],
  subjectType: "pairwise",
  grantTypes: ["authorization_code"],
  responseTypes: ["code"],
  tokenEndpointAuthMethod: "client_secret_basic",
});

console.log(`OIDC client ${name} created.`);
console.log(`Client ID: ${uuidToHumanId(client.id, "oidc")}`);
console.log(`Client secret: ${secret}`);

process.exit(0);
