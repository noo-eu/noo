import { calculateJwkThumbprint } from "jose";

export async function generateSet() {
  const rsa = await generateRSA();
  const ec = await generateEC();
  const ed = await generateEd25519();

  return {
    keys: [
      await exportPrivate(rsa),
      await exportPrivate(ec),
      await exportPrivate(ed),
    ],
  };
}

function generateRSA(hash: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256") {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash,
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
    },
    true,
    ["sign"],
  );
}

function generateEC(curve: "P-256" | "P-384" | "P-521" = "P-256") {
  return crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: curve,
    },
    true,
    ["sign"],
  );
}

function generateEd25519() {
  return crypto.subtle.generateKey("Ed25519", true, ["sign"]);
}

async function exportPrivate(key: CryptoKeyPair) {
  const pk = key.privateKey;

  const obj = { ...(await crypto.subtle.exportKey("jwk", pk)) } as Record<
    string,
    unknown
  >;

  delete obj.alg;
  delete obj.ext;
  delete obj.key_ops;

  // Set the key id using the thumbprint of the key
  obj.kid = await calculateJwkThumbprint(obj);

  return obj;
}
