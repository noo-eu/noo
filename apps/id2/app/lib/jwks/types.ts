import { z } from "zod";

const baseKey = z.object({
  kid: z.string().optional(),
  use: z.enum(["sig", "enc"]).optional(),
  alg: z.string().optional(),
  x5c: z.array(z.string()).optional(),
  x5t: z.string().optional(),
});

const rsaKey = baseKey.extend({
  kty: z.literal("RSA"),
  n: z.string(),
  e: z.string(),
  d: z.string().optional(),
  p: z.string().optional(),
  q: z.string().optional(),
  dp: z.string().optional(),
  dq: z.string().optional(),
  qi: z.string().optional(),
});

const ecKey = baseKey.extend({
  kty: z.literal("EC"),
  crv: z.string(),
  x: z.string(),
  y: z.string(),
  d: z.string().optional(),
});

const edKey = baseKey.extend({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  x: z.string(),
  d: z.string().optional(),
});

export const jwkSchema = z.union([rsaKey, ecKey, edKey]);
export const jwks = z.object({ keys: z.array(jwkSchema) });

export type JwkSet = z.infer<typeof jwks>;
