import { jwks, type JwkSet } from "@noo/oidc-server/types";
import { access, readFile } from "fs/promises";
import { type Jwk } from ".";

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
  const legacyKeys = await loadJwkSet("keys/old.jwk");
  const currentKeys = await loadJwkSet("keys/current.jwk");

  return {
    legacy: legacyKeys.keys,
    current: currentKeys.keys,
  };
}

export async function loadJwkSet(path: string): Promise<JwkSet> {
  try {
    await access(path);
  } catch {
    return { keys: [] };
  }

  const data = await readFile(path);
  return jwks.parse(JSON.parse(data.toString()));
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
