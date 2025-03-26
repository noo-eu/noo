import {
  RESPONSE_MODES_SUPPORTED,
  RESPONSE_TYPES_SUPPORTED,
} from "@/app/oidc/configuration";
import { z } from "zod";

const claimRequestSchema = z.record(
  z.string(),
  z.nullable(
    z.object({
      essential: z.boolean().optional(),
      value: z.string().optional(),
      values: z.array(z.string()).optional(),
    }),
  ),
);

export const claimsSchema = z.object({
  userinfo: claimRequestSchema.optional(),
  id_token: claimRequestSchema.optional(),
});

export type Claims = z.infer<typeof claimsSchema>;

export type ResponseType = (typeof RESPONSE_TYPES_SUPPORTED)[number];
export type ResponseMode = (typeof RESPONSE_MODES_SUPPORTED)[number];

export type AuthorizationRequest = {
  issuer: string;
  tenantId?: string;

  client_id: string;
  response_type: ResponseType;
  response_mode: ResponseMode;
  redirect_uri: string;
  scopes: string[];
  claims: Claims;
  state?: string;
  nonce?: string;
  prompt?: string;
  max_age?: number;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const registrationResponse = registrationRequest.extend({
  client_id: z.string(),
  client_id_issued_at: z.number(),
  client_secret: z.string(),
  client_secret_expires_at: z.number().optional(),
});
export type RegistrationResponse = z.infer<typeof registrationResponse>;

// OIDC Configuration
export type ProviderMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  acr_values_supported?: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  id_token_encryption_alg_values_supported?: string[];
  id_token_encryption_enc_values_supported?: string[];
  userinfo_signing_alg_values_supported?: string[];
  userinfo_encryption_alg_values_supported?: string[];
  userinfo_encryption_enc_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  request_object_encryption_alg_values_supported?: string[];
  request_object_encryption_enc_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  display_values_supported?: string[];
  claim_types_supported?: string[];
  claims_supported?: string[];
  service_documentation?: string;
  claims_locales_supported?: string[];
  ui_locales_supported?: string[];
  claims_parameter_supported?: boolean;
  request_parameter_supported?: boolean;
  request_uri_parameter_supported?: boolean;
  require_request_uri_registration?: boolean;
  op_policy_uri?: string;
  op_tos_uri?: string;
  check_session_iframe?: string;
  end_session_endpoint?: string;
};
