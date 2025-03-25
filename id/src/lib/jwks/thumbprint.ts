import { sha256 } from "@/utils";

export function computeJwkThumbprint(jwk: JsonWebKey) {
  let fields: Record<string, string>;

  switch (jwk.kty) {
    case "RSA":
      fields = {
        e: jwk.e!,
        kty: jwk.kty,
        n: jwk.n!,
      };
      break;

    case "EC":
      fields = {
        crv: jwk.crv!,
        kty: jwk.kty,
        x: jwk.x!,
        y: jwk.y!,
      };
      break;

    case "OKP":
      fields = {
        crv: jwk.crv!,
        kty: jwk.kty,
        x: jwk.x!,
      };
      break;

    default:
      throw new Error(`Unsupported kty: ${jwk.kty}`);
  }

  // Canonically serialize: ensure lexicographical order
  const ordered = Object.keys(fields)
    .sort()
    .reduce(
      (obj, key) => {
        obj[key] = fields[key];
        return obj;
      },
      {} as Record<string, string>,
    );

  return sha256(JSON.stringify(ordered)).digest("base64url");
}
