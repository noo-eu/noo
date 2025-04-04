import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";
import { generateSet } from "~/lib.server/jwks/gen";

if (!existsSync("keys")) {
  mkdirSync("keys");
}

if (existsSync("keys/current.jwk")) {
  renameSync("keys/current.jwk", "keys/old.jwk");
}

const keys = await generateSet();
writeFileSync("keys/current.jwk", JSON.stringify(keys, null, 2));
