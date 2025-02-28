import { readdir, readFile } from "fs";
import { z } from "zod";

const baseKey = z.object({
  kid: z.string(),
  use: z.enum(["sig", "enc"]).optional(),
  alg: z.string().optional(),
  x5c: z.array(z.string()).optional(),
  x5t: z.string().optional(),
});

const rsaKey = baseKey.extend({
  kty: z.literal("RSA"),
  n: z.string(),
  e: z.string(),
});

const ecKey = baseKey.extend({
  kty: z.literal("EC"),
  crv: z.string(),
  x: z.string(),
  y: z.string(),
});

const edKey = baseKey.extend({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  x: z.string(),
});

const keySchema = z.union([rsaKey, ecKey, edKey]);
export const jwks = z.object({ keys: z.array(keySchema) });

function newRSAKey() {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
    },
    true,
    ["sign"],
  );
}

function newECKey() {
  return crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"],
  );
}

function newEd25519Key() {
  return crypto.subtle.generateKey("Ed25519", true, ["sign"]);
}

async function exportKey(key: CryptoKey) {
  const obj = { ...(await crypto.subtle.exportKey("jwk", key)) } as Record<
    string,
    unknown
  >;

  delete obj.ext;
  delete obj.key_ops;

  // Set the key id using the thumbprint of the key
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(obj));
  const digest = await crypto.subtle.digest("SHA-256", data);
  obj.kid = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return obj;
}

export async function generateNewKeySet() {
  const rsa = await newRSAKey();
  const ec = await newECKey();
  const ed = await newEd25519Key();

  return {
    rsa: await exportKey(rsa.privateKey),
    ec: await exportKey(ec.privateKey),
    ed: await exportKey(ed.privateKey),
  };
}

// Keep a 5m cache of the keys instead of reading them from disk every time
let keysCache: {
  legacy: Record<string, unknown>[];
  current: Record<string, unknown>[];
} | null = null;
let keysCacheTime = 0;
let keysCacheExpiry = 5 * 60 * 1000;
export async function getKeys(): Promise<{
  legacy: Record<string, unknown>[];
  current: Record<string, unknown>[];
}> {
  if (!keysCache || Date.now() - keysCacheTime > keysCacheExpiry) {
    try {
      keysCache = await loadKeysRaw();
      keysCacheTime = Date.now();
    } catch (err) {
      console.log("Failed to load new keys from disk:", err);
      if (!keysCache) {
        throw err;
      }

      console.log("Falling back to using the old keys");
    }
  }

  return keysCache;
}

export async function getPublicKeys() {
  const keys = await getKeys();

  return {
    legacy: keys.legacy.map(jwkToPublicJwk),
    current: keys.current.map(jwkToPublicJwk),
  };
}

function jwkToPublicJwk(jwk: Record<string, unknown>) {
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
    if (jwk[field]) {
      obj[field] = jwk[field];
    }
  }

  return obj;
}

async function loadKeysRaw() {
  const legacyKeys = await loadKeysFromDir("keys/old");
  const currentKeys = await loadKeysFromDir("keys/current");

  return {
    legacy: legacyKeys,
    current: currentKeys,
  };
}

function loadKeysFromDir(path: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    readdir(path, async (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const keys = [];
      for (const file of files) {
        const content = await loadKeyRaw(`${path}/${file}`);
        keys.push(content);
      }

      resolve(keys);
    });
  });
}

function loadKeyRaw(path: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const key = keySchema.parse(JSON.parse(data.toString()));
        resolve(key);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// async function importKey(key: Record<string, unknown>): Promise<CryptoKey> {
// switch (key.kty) {
//   case "RSA":
//     console.log("Importing RSA key", key);
//     return await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["sign", "verify"])!;
//   case "EC":
//     return await crypto.subtle.importKey("jwk", key, { name: "ECDSA", namedCurve: "P256" }, true, ["sign"])!;
//   case "OKP":
//     return await crypto.subtle.importKey("jwk", key, "Ed25519", true, ["sign"])!;
//   default:
//     throw new Error("Unknown key type " + key.kty);
// }
// }
