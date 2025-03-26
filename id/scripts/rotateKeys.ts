import { generateSet } from "@/lib/jwks/gen";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";

mkdirSync("keys");

if (existsSync("keys/current.jwk")) {
  renameSync("keys/current.jwk", "keys/old.jwk");
}

const keys = await generateSet();
writeFileSync("keys/current.jwk", JSON.stringify(keys, null, 2));
