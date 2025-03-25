import { jwkSchema } from "@/lib/oidc/types";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";
import { Jwk } from ".";

// Keep a 5m cache of the keys instead of reading them from disk every time
let keysCache: {
  legacy: Jwk[];
  current: Jwk[];
} | null = null;
let keysCacheTime = 0;
const KEYS_CACHE_TTL = 5 * 60 * 1000;

export async function currentPrivateKeys() {
  return (await getKeys()).current;
}

export async function allPublicKeys(): Promise<Jwk[]> {
  const keys = await getKeys();

  return [
    ...keys.current.map(jwkToPublicJwk),
    ...keys.legacy.map(jwkToPublicJwk),
  ];
}

// Returns all private keys from the keys directory, both legacy and current, as
// an object with two arrays: legacy and current. At every TTL, the keys are
// reloaded from disk.
export async function getKeys(): Promise<{
  legacy: Jwk[];
  current: Jwk[];
}> {
  if (!keysCache || Date.now() - keysCacheTime > KEYS_CACHE_TTL) {
    try {
      keysCache = await loadKeysRaw();
      keysCacheTime = Date.now();
    } catch (err) {
      console.error("Failed to load new keys from disk:", err);
      if (!keysCache) {
        throw err;
      }

      console.warn("Falling back to using the old keys");
    }
  }

  return keysCache;
}

export async function loadKeysRaw() {
  const legacyKeys = await loadKeysFromDir("keys/old");
  const currentKeys = await loadKeysFromDir("keys/current");

  return {
    legacy: legacyKeys,
    current: currentKeys,
  };
}

export async function loadKeysFromDir(path: string): Promise<Jwk[]> {
  const files = await readdir(path);

  const keys = [];
  for (const file of files) {
    const content = await loadKeyRaw(`${path}/${file}`);
    keys.push(content);
  }

  return keys;
}

async function loadKeyRaw(path: string): Promise<Jwk> {
  const data = await readFile(path);

  return jwkSchema.parse(JSON.parse(data.toString()));
}

// Transform a private JWK into a public JWK by stripping out private fields
function jwkToPublicJwk(jwk: Jwk): Jwk {
  const fieldsWhitelist = [
    "kty",
    "use",
    "alg",
    "kid",
    "n",
    "e",
    "crv",
    "x",
    "y",
  ];

  const obj: Record<string, unknown> = {};
  for (const field of fieldsWhitelist) {
    if (field in jwk) {
      obj[field] = jwk[field as keyof Jwk];
    }
  }

  return obj;
}
