import { z } from "zod";

// JWKS
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

// OIDC Dynamic Client Registration
export const registrationRequest = z.object({
  redirect_uris: z.array(z.string()).nonempty(),
  response_types: z.array(z.string()).optional(),
  grant_types: z.array(z.string()).optional(),
  application_type: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  client_name: z.string().optional(),
  logo_uri: z.string().optional(),
  client_uri: z.string().optional(),
  policy_uri: z.string().optional(),
  tos_uri: z.string().optional(),
  jwks_uri: z.string().optional(),
  jwks: jwks.optional(),
  sector_identifier_uri: z.string().optional(),
  subject_type: z.string().optional(),
  id_token_signed_response_alg: z.string().optional(),
  id_token_encrypted_response_alg: z.string().optional(),
  id_token_encrypted_response_enc: z.string().optional(),
  userinfo_signed_response_alg: z.string().optional(),
  userinfo_encrypted_response_alg: z.string().optional(),
  userinfo_encrypted_response_enc: z.string().optional(),
  request_object_signing_alg: z.string().optional(),
  request_object_encryption_alg: z.string().optional(),
  request_object_encryption_enc: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
  token_endpoint_auth_signing_alg: z.string().optional(),
  default_max_age: z.number().optional(),
  require_auth_time: z.boolean().optional(),
  default_acr_values: z.array(z.string()).optional(),
  initiate_login_uri: z.string().optional(),
  request_uris: z.array(z.string()).optional(),
  post_logout_redirect_uris: z.array(z.string()).optional(),
});
export type RegistrationRequest = z.infer<typeof registrationRequest>;

const registrationResponse = registrationRequest.extend({
  client_id: z.string(),
  client_id_issued_at: z.number(),
  client_secret: z.string(),
  client_secret_expires_at: z.number().optional(),
});
export type RegistrationResponse = z.infer<typeof registrationResponse>;
