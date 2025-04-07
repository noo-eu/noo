import configuration from "./configuration";
import { type ProviderMetadata } from "./types";

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
] as const;

export const ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED = [
  "none",
  "RS256",
  "ES256",
  "EdDSA",
] as const;

export const TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED = [
  "client_secret_basic",
  "client_secret_post",
  "client_secret_jwt",
  "private_key_jwt",
  "none",
] as const;

export const ACR_VALUES_SUPPORTED = ["simple", "mfa"] as const;

export const CODE_CHALLENGE_METHODS_SUPPORTED = ["S256"] as const;

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
  "preferred_username",
  "picture",
  "locale",
  "zoneinfo",
  "updated_at",
] as const;

export const SUBJECT_TYPES_SUPPORTED = ["public", "pairwise"] as const;

export type IdpProfile = "public" | "tenant" | "fapi2";

export function discoveryMetadata(
  profile: IdpProfile = "public",
  scope?: string,
) {
  const shared = sharedMetadata();

  const issuer = `${configuration.baseUrl}${scope ?? ""}`;

  const metadata: ProviderMetadata = {
    issuer,
    ...shared,
  };

  if (profile === "tenant") {
    metadata.registration_endpoint = `${issuer}/register`;
    metadata.end_session_endpoint = `${issuer}/end-session`;
  } else if (profile === "fapi2") {
    metadata.grant_types_supported = ["authorization_code"];
    metadata.response_types_supported = ["code"];
    metadata.token_endpoint_auth_methods_supported = [
      // "tls_client_auth",
      "private_key_jwt",
    ];
    metadata.pushed_authorization_request_endpoint = `${configuration.baseUrl}/par`;
    metadata.require_pushed_authorization_requests = true;
  }

  return metadata;
}

function sharedMetadata() {
  return {
    authorization_endpoint: `${configuration.baseUrl}/authorize`,
    token_endpoint: `${configuration.baseUrl}/token`,
    userinfo_endpoint: `${configuration.baseUrl}/userinfo`,
    jwks_uri: `${configuration.baseUrl}/jwks.json`,
    check_session_iframe: `${configuration.baseUrl}/session`,
    scopes_supported: ["openid", "profile", "email", "address", "phone"],
    grant_types_supported: [...GRANT_TYPES_SUPPORTED],
    response_modes_supported: [...RESPONSE_MODES_SUPPORTED],
    response_types_supported: [...RESPONSE_TYPES_SUPPORTED],
    subject_types_supported: [...SUBJECT_TYPES_SUPPORTED],
    id_token_signing_alg_values_supported: [
      ...ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
    ],
    userinfo_signing_alg_values_supported: [
      ...ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
    ],
    request_object_signing_alg_values_supported: [
      ...ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
    ],
    token_endpoint_auth_methods_supported: [
      ...TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
    ],
    claims_supported: [...CLAIMS_SUPPORTED],
    ui_locales_supported: configuration.supportedLocales,
    code_challenge_methods_supported: [...CODE_CHALLENGE_METHODS_SUPPORTED],
  };
}
