import { schema } from "@/db";
import { z } from "zod";
import {
  RESPONSE_TYPES_SUPPORTED,
  GRANT_TYPES_SUPPORTED,
  ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
  TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
  ACR_VALUES_SUPPORTED,
} from "./configuration";
import { createOidcClient } from "@/db/oidc_clients";
import { jwks } from "./jwks";

const registrationRequest = z.object({
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const registrationResponse = registrationRequest.extend({
  client_id: z.string(),
  client_id_issued_at: z.number(),
  client_secret: z.string(),
  client_secret_expires_at: z.number().optional(),
});
type RegistrationResponse = z.infer<typeof registrationResponse>;

export async function oidcClientRegistration(
  request: Record<string, unknown>,
  tenant: typeof schema.tenants.$inferSelect,
) {
  const parseResult = registrationRequest.safeParse(request);
  if (!parseResult.success) {
    const badField = parseResult.error.issues[0].path.join(".");
    const message = parseResult.error.issues[0].message;
    const errorDescription = `The property ${badField} is invalid: ${message}`;

    return buildErrorResponse(
      badField == "redirect_uris"
        ? "invalid_redirect_uri"
        : "invalid_client_metadata",
      errorDescription,
    );
  }

  const config = parseResult.data;
  config.application_type ||= "web";
  config.subject_type ||= "pairwise";
  config.require_auth_time ||= false;

  const clientName = extractLocalizedField(request, "client_name");
  const logoUri = extractLocalizedField(request, "logo_uri");
  const clientUri = extractLocalizedField(request, "client_uri");
  const policyUri = extractLocalizedField(request, "policy_uri");
  const tosUri = extractLocalizedField(request, "tos_uri");

  const configValidationResult = await validateRegistration(config);
  if (configValidationResult) {
    return configValidationResult;
  }

  const secretBytes = crypto.getRandomValues(new Uint8Array(33));
  const clientSecret = btoa(String.fromCharCode(...secretBytes));

  const client = await createOidcClient({
    tenantId: tenant.id,
    clientSecret,
    redirectUris: config.redirect_uris,
    responseTypes: config.response_types,
    grantTypes: config.grant_types,
    applicationType: config.application_type,
    contacts: config.contacts,
    clientName,
    logoUri,
    clientUri,
    policyUri,
    tosUri,
    jwksUri: config.jwks_uri,
    jwks: config.jwks,
    sectorIdentifierUri: config.sector_identifier_uri,
    subjectType: config.subject_type,
    idTokenSignedResponseAlg: config.id_token_signed_response_alg,
    userinfoSignedResponseAlg: config.userinfo_signed_response_alg,
    requestObjectSigningAlg: config.request_object_signing_alg,
    tokenEndpointAuthMethod: config.token_endpoint_auth_method,
    tokenEndpointAuthSigningAlg: config.token_endpoint_auth_signing_alg,
    defaultMaxAge: config.default_max_age,
    requireAuthTime: config.require_auth_time,
    defaultAcrValues: config.default_acr_values,
    initiateLoginUri: config.initiate_login_uri,
    requestUris: config.request_uris,
    postLogoutRedirectUris: config.post_logout_redirect_uris,
  });

  return Response.json(oidcClientToResponse(client), {
    status: 201,
  });
}

async function validateRegistration(
  config: z.infer<typeof registrationRequest>,
) {
  const redirect_uri_validation_result = validateRedirectUris(
    config.redirect_uris,
    config.application_type,
  );
  if (redirect_uri_validation_result) {
    return redirect_uri_validation_result;
  }

  // Ensure only supported response types are set
  config.response_types ||= ["code"];
  config.response_types = config.response_types?.filter((rt: string) =>
    RESPONSE_TYPES_SUPPORTED.includes(rt),
  );
  if (config.response_types.length === 0) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "No supported response types.",
    );
  }

  // Validate grant types, tolerate missing grant_types
  config.grant_types ||= ["authorization_code"];
  const all_response_types = config.response_types.join(" ") || "";
  config.grant_types = config.grant_types.filter((gt: string) =>
    GRANT_TYPES_SUPPORTED.includes(gt),
  );
  if (!config.grant_types.includes("authorization_code")) {
    if (all_response_types.match(/\bcode\b/)) {
      config.grant_types.push("authorization_code");
    }
  }

  if (!config.grant_types.includes("implicit")) {
    if (all_response_types.match(/token\b/)) {
      config.grant_types.push("implicit");
    }
  }

  // Validate that contacts are valid email addresses
  if (config.contacts) {
    if (config.contacts.length > 5) {
      return buildErrorResponse(
        "invalid_client_metadata",
        "Too many contacts.",
      );
    }

    for (const contact of config.contacts) {
      if (!contact.includes("@")) {
        return buildErrorResponse(
          "invalid_client_metadata",
          "Invalid email address.",
        );
      }
    }
  }

  if (config.jwks_uri && config.jwks) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Only one of jwks_uri and jwks must be set.",
    );
  }

  if (config.jwks_uri) {
    const jwksUri = new URL(config.jwks_uri);
    if (jwksUri.protocol !== "https:") {
      return buildErrorResponse(
        "invalid_client_metadata",
        "JWKS URI must use HTTPS.",
      );
    }
  }

  if (config.sector_identifier_uri && config.subject_type === "pairwise") {
    const sectorIdentifierUri = new URL(config.sector_identifier_uri);
    if (sectorIdentifierUri.protocol !== "https:") {
      return buildErrorResponse(
        "invalid_client_metadata",
        "Sector Identifier URI must use HTTPS.",
      );
    }

    let sectorIdentifierData;
    try {
      const sectorIdentifierResponse = await fetch(
        config.sector_identifier_uri,
        {
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(2000),
        },
      );

      if (!sectorIdentifierResponse.ok) {
        return buildErrorResponse(
          "invalid_client_metadata",
          "Failed to fetch sector identifier URI.",
        );
      }

      sectorIdentifierData = await sectorIdentifierResponse.json();
      if (!Array.isArray(sectorIdentifierData)) {
        return buildErrorResponse(
          "invalid_client_metadata",
          "Sector Identifier URI must return an array.",
        );
      }
    } catch (e) {
      console.error(e);
      return buildErrorResponse(
        "invalid_client_metadata",
        "Failed to fetch sector identifier URI.",
      );
    }

    for (const uri of config.redirect_uris) {
      if (!sectorIdentifierData.includes(uri)) {
        return buildErrorResponse(
          "invalid_client_metadata",
          "All Redirect URIs must be included in sector identifier.",
        );
      }
    }
  }

  if (config.subject_type !== "pairwise" && config.subject_type !== "public") {
    config.subject_type = "pairwise";
  }

  if (config.id_token_signed_response_alg === "none") {
    // This is only allowed if the only response type is "code"
    if (
      config.response_types.length !== 1 ||
      config.response_types[0] !== "code"
    ) {
      return buildErrorResponse(
        "invalid_client_metadata",
        "ID Token signing algorithm cannot be 'none' for this response type.",
      );
    }
  }

  config.id_token_signed_response_alg ||= "RS256";
  if (
    !ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED.includes(
      config.id_token_signed_response_alg,
    )
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Unsupported ID Token signing algorithm.",
    );
  }

  if (
    config.id_token_encrypted_response_alg ||
    config.id_token_encrypted_response_enc
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "ID Token encryption is not supported.",
    );
  }

  if (
    config.userinfo_signed_response_alg &&
    !ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED.includes(
      config.userinfo_signed_response_alg,
    )
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Unsupported Userinfo signing algorithm.",
    );
  }

  if (
    config.userinfo_encrypted_response_alg ||
    config.userinfo_encrypted_response_enc
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Userinfo encryption is not supported.",
    );
  }

  if (
    config.request_object_signing_alg &&
    !ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED.includes(
      config.request_object_signing_alg,
    )
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Unsupported Request Object signing algorithm.",
    );
  }

  if (
    config.request_object_encryption_alg ||
    config.request_object_encryption_enc
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Request Object encryption is not supported.",
    );
  }

  config.token_endpoint_auth_method ||= "client_secret_basic";
  if (
    !TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED.includes(
      config.token_endpoint_auth_method,
    )
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Unsupported Token Endpoint authentication method.",
    );
  }

  if (
    (config.token_endpoint_auth_signing_alg &&
      !ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED.includes(
        config.token_endpoint_auth_signing_alg,
      )) ||
    config.token_endpoint_auth_signing_alg === "none"
  ) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Unsupported Token Endpoint authentication signing algorithm.",
    );
  }

  if (config.default_max_age && config.default_max_age < 0) {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Default max age must be greater than or equal to 0.",
    );
  }

  config.default_acr_values = config.default_acr_values?.filter((acr: string) =>
    ACR_VALUES_SUPPORTED.includes(acr),
  );

  if (config.initiate_login_uri) {
    const initiateLoginUri = new URL(config.initiate_login_uri);
    if (initiateLoginUri.protocol !== "https:") {
      return buildErrorResponse(
        "invalid_client_metadata",
        "Initiate Login URI must use HTTPS.",
      );
    }
  }
}

export function validateRedirectUris(
  redirect_uris: string[],
  application_type: unknown,
) {
  if (redirect_uris.length > 10) {
    return buildErrorResponse(
      "invalid_redirect_uri",
      "Too many redirect URIs.",
    );
  }

  for (const uri of redirect_uris) {
    // TODO: query strings must be allowed (fragment is correctly not allowed)
    if (uri.includes("#") || uri.includes("?")) {
      return buildErrorResponse(
        "invalid_redirect_uri",
        "Redirect URIs must not contain fragments or query strings.",
      );
    }
  }

  if (application_type === "web") {
    for (const uri of redirect_uris) {
      if (!uri.startsWith("https://") && !process.env.TEST) {
        return buildErrorResponse(
          "invalid_redirect_uri",
          "Redirect URIs must use HTTPS.",
        );
      }

      const host = new URL(uri).hostname;
      if (host == "localhost" && !process.env.TEST) {
        return buildErrorResponse(
          "invalid_redirect_uri",
          "Redirect URIs must not use localhost.",
        );
      }
    }
  } else if (application_type === "native") {
    for (const uri of redirect_uris) {
      if (uri.startsWith("http://")) {
        const host = new URL(uri).hostname;
        if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") {
          return buildErrorResponse(
            "invalid_redirect_uri",
            "Native clients must use custom URI schemes or loopback addresses on HTTP.",
          );
        }
      } else if (uri.startsWith("https://")) {
        return buildErrorResponse(
          "invalid_redirect_uri",
          "Native clients must not use HTTPS.",
        );
      }
    }
  } else {
    return buildErrorResponse(
      "invalid_client_metadata",
      "Invalid application_type.",
    );
  }
}

function extractLocalizedField(config: Record<string, unknown>, field: string) {
  const values: Record<string, string> = {};

  if (config[field] && typeof config[field] === "string") {
    values[""] = config[field];
  }

  for (const key in config) {
    if (key.startsWith(`${field}#`) && typeof config[key] === "string") {
      values[key.slice(field.length + 1)] = config[key];
    }
  }

  return values;
}

function oidcClientToResponse(
  client: typeof schema.oidcClients.$inferSelect,
): RegistrationResponse {
  const response: Record<string, unknown> = {
    client_id: client.id,
    client_id_issued_at: client.createdAt.getTime(),
    client_secret: client.clientSecret,
    client_secret_expires_at: 0,
    redirect_uris: client.redirectUris,
    response_types: client.responseTypes,
    grant_types: client.grantTypes,
    application_type: client.applicationType,
    contacts: client.contacts,
    jwks_uri: client.jwksUri,
    jwks: client.jwks,
    sector_identifier_uri: client.sectorIdentifierUri,
    subject_type: client.subjectType,
    id_token_signed_response_alg: client.idTokenSignedResponseAlg,
    userinfo_signed_response_alg: client.userinfoSignedResponseAlg,
    request_object_signing_alg: client.requestObjectSigningAlg,
    token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    token_endpoint_auth_signing_alg: client.tokenEndpointAuthSigningAlg,
    default_max_age: client.defaultMaxAge,
    require_auth_time: client.requireAuthTime,
    default_acr_values: client.defaultAcrValues,
    initiate_login_uri: client.initiateLoginUri,
    request_uris: client.requestUris,
    post_logout_redirect_uris: client.postLogoutRedirectUris,
  };

  const localized: Record<string, Record<string, string> | null> = {
    client_name: client.clientName as Record<string, string> | null,
    logo_uri: client.logoUri as Record<string, string> | null,
    client_uri: client.clientUri as Record<string, string> | null,
    policy_uri: client.policyUri as Record<string, string> | null,
    tos_uri: client.tosUri as Record<string, string> | null,
  };

  for (const key in localized) {
    if (localized[key]) {
      for (const locale in localized[key]) {
        if (locale === "") {
          response[key] = localized[key][locale];
        } else {
          response[`${key}#${locale}`] = localized[key][locale];
        }
      }
    }
  }

  // Strip out null values
  for (const key in response) {
    if (response[key] === null) {
      delete response[key];
    }
  }

  return response as RegistrationResponse;
}

function buildErrorResponse(error: string, error_description: string) {
  return Response.json(
    { error, error_description },
    {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}
