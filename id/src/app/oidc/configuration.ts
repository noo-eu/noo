import { SUPPORTED_LANGUAGES } from "@/i18n";
import { ProviderMetadata } from "@/lib/oidc/types";

export const RESPONSE_TYPES_SUPPORTED = [
  "code",
  "id_token",
  "id_token token",
  "code id_token",
  "code token",
  "code id_token token",
  "token", // An OAuth 2.0 request
] as const;

export const RESPONSE_MODES_SUPPORTED = [
  "form_post",
  "fragment",
  "query",
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

export const SUBJECT_TYPES_SUPPORTED = ["public", "pairwise"];

export function buildConfiguration(request: Request, domain?: string) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const issuer = `${proto}://${host}/oidc` + (domain ? `/${domain}` : "");

  const config: ProviderMetadata = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${proto}://${host}/oidc/token`,
    userinfo_endpoint: `${proto}://${host}/oidc/userinfo`,
    jwks_uri: `${proto}://${host}/oidc/jwks.json`,
    scopes_supported: ["openid", "profile", "email", "address", "phone"],
    response_types_supported: [...RESPONSE_TYPES_SUPPORTED],
    response_modes_supported: [...RESPONSE_MODES_SUPPORTED],
    subject_types_supported: SUBJECT_TYPES_SUPPORTED,
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
    check_session_iframe: `${proto}://${host}/oidc/session`,
  };

  if (domain) {
    config.registration_endpoint = `${issuer}/register`;
    config.end_session_endpoint = `${issuer}/end_session`;
  }

  return config;
}
