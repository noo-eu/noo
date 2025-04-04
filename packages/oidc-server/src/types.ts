import { z } from "zod";
import {
  ACR_VALUES_SUPPORTED,
  GRANT_TYPES_SUPPORTED,
  ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
  RESPONSE_MODES_SUPPORTED,
  RESPONSE_TYPES_SUPPORTED,
  SUBJECT_TYPES_SUPPORTED,
  TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
} from "./discovery";

// OIDC Discovery
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
  pushed_authorization_request_endpoint?: string;
  require_pushed_authorization_requests?: boolean;
};

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
export type SubjectType = (typeof SUBJECT_TYPES_SUPPORTED)[number];
export type SignatureAlg =
  (typeof ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED)[number];
export type TokenEndpointAuthMethod =
  (typeof TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED)[number];
export type GrantType = (typeof GRANT_TYPES_SUPPORTED)[number];
export type AcrValue = (typeof ACR_VALUES_SUPPORTED)[number];

export type AuthorizationRequest = {
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
