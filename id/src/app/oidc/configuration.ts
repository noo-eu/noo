import { SUPPORTED_LANGUAGES } from "@/i18n/request";

type ProviderMetadata = {
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
};

export const RESPONSE_TYPES_SUPPORTED = [
  "code",
  "id_token",
  "id_token token",
] as const;

export const GRANT_TYPES_SUPPORTED = [
  "authorization_code",
  "implicit",
  "refresh_token",
];

export const ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED = [
  "none",
  "RS256",
  "ES256",
  "EdDSA",
];

export const TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED = [
  "client_secret_basic",
  "client_secret_post",
  "client_secret_jwt",
  "private_key_jwt",
  "none",
];

export const ACR_VALUES_SUPPORTED = ["simple", "mfa"];

export const CLAIMS_SUPPORTED = [
  "sub",
  "aud",
  "exp",
  "iss",
  "iat",
  "email",
  "email_verified",
  "name",
  "given_name",
  "family_name",
];

export function buildConfiguration(request: Request, domain?: string) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const issuer = `${proto}://${host}/oidc` + (domain ? `/${domain}` : "");

  const config: ProviderMetadata = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${proto}://${host}/oidc/token`,
    userinfo_endpoint: `${proto}://${host}/oidc/userinfo`,
    jwks_uri: `${proto}://${host}/oidc/jwks.json`,
    scopes_supported: ["openid", "profile", "email"],
    response_types_supported: RESPONSE_TYPES_SUPPORTED,
    subject_types_supported: ["public", "pairwise"],
    grant_types_supported: GRANT_TYPES_SUPPORTED,
    id_token_signing_alg_values_supported:
      ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
    userinfo_signing_alg_values_supported:
      ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
    request_object_signing_alg_values_supported:
      ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
    token_endpoint_auth_methods_supported:
      TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
    claims_supported: CLAIMS_SUPPORTED,
    ui_locales_supported: SUPPORTED_LANGUAGES,
  };

  if (domain) {
    config.registration_endpoint = `${issuer}/register`;
  }

  return config;
}
