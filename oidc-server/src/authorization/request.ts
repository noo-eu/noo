import { err, ok, Result } from "neverthrow";
import { decodeIdToken } from "../idToken";
import { AuthorizationRequest, claimsSchema } from "../types";
import { returnToClient } from "./finish";
import { preflightCheck } from "./preflight";
import { authorizationAny } from "./promptAny";
import { authorizationNone } from "./promptNone";

export type AuthorizationResult = {
  params: AuthorizationRequest;

  nextStep:
    | "REDIRECT"
    | "SELECT_ACCOUNT"
    | "FORM_POST"
    | "SIGN_IN"
    | "CONFIRM"
    | "CONSENT";
  url?: string;
  data?: Record<string, string | undefined>;
  userId?: string;
};

/**
 * Performs an OIDC authorization request.
 *
 * A few types of failures are unrecoverable and must not be returned to the
 * client. In these cases we return err() with a string error message.
 *
 * Once the essential parameters are accepted, further errors are returned to
 * the client as a response. These are ok() values.
 *
 * @param originalParams - The request parameters from the query string or
 * request body.
 * @returns a Result with the response to return to the client, or an error
 * string, only in case of a critical error.
 */
export async function performOidcAuthorization(
  originalParams: Record<string, string | undefined>,
): Promise<Result<AuthorizationResult, string>> {
  const preflightResult = await preflightCheck(originalParams);
  if (preflightResult.isErr()) {
    return err(preflightResult.error);
  }

  const { client, params, raw } = preflightResult.value;

  /**
   * Some clients may not need to authenticate the user, and may only need to
   * obtain an access token. In this case, the client must not request the openid
   * scope, and the request must not include any OIDC specific parameters.
   */
  if (!params.scopes.includes("openid")) {
    if (!isValidOauth2Request(originalParams)) {
      return ok(await returnToClient(params, { error: "invalid_request" }));
    }
  }

  /**
   * If the response_type includes id_token, the nonce parameter is required.
   */
  if (params.response_type.includes("id_token") && !params.nonce) {
    return ok(
      await returnToClient(params, { error: "implicit_missing_nonce" }),
    );
  }

  /**
   * Parse the claims parameter, if present. This parameter is used to request
   * specific claims to be included in the id_token. The claims parameter must
   * be a JSON object.
   */
  if (!parseClaims(params, raw)) {
    return ok(await returnToClient(params, { error: "invalid_request" }));
  }

  /**
   * Parse the max_age parameter, if present. This parameter is used to request
   * that the user re-authenticate if they last authenticated more than a certain
   * number of seconds ago. The client can also register with a default max_age
   * value, which will be used if the parameter is not present.
   */
  if (!parseMaxAge(params, raw)) {
    return ok(await returnToClient(params, { error: "invalid_request" }));
  }

  /**
   * Some scopes (profile, email, etc) are just a shorthand for requesting
   * specific claims in the userinfo endpoint. Convert these scopes into
   * userinfo claim requests.
   */
  scopesToClaims(params);

  /**
   * If the id_token_hint is present, extract the sub claim from the id_token.
   */
  params.id_token_hint = await extractIdTokenSub(
    params.id_token_hint,
    client.issuer,
    client.idTokenSignedResponseAlg,
  );

  /**
   * We're done interpreting the request. Now we can proceed with the
   * authorization process.
   */

  switch (params.prompt) {
    case "none":
      return ok(await authorizationNone(params, client));
    case "select_account":
      // We are requested to prompt the user to select an account. This could be
      // used to switch between multiple accounts.
      return ok({
        params,
        nextStep: "SELECT_ACCOUNT",
      });
    case "consent":
    // We are requested to re-confirm the user's consent, even if they have
    // already consented to the client.
    // TODO: delete the user's consent for this client
    case "login":
      // We are requested to re-authenticate the user. This could be used to
      // protect specific high-value operations.
      params.max_age = 0;

    // Fall through
    default:
      return ok(await authorizationAny(params, client));
  }
}

function isValidOauth2Request(params: Record<string, string | undefined>) {
  // Well, technically this is not an OIDC request, but an OAuth2 request.
  // We will not be issuing an id_token, but we will still issue an access
  // token (with no access to the userinfo endpoint). However, some OIDC
  // specific parameters are not allowed.
  if (
    params.id_token_hint ||
    params.login_hint ||
    params.max_age ||
    params.acr_values
  ) {
    // These parameters don't make sense in an OAuth2 request.
    return false;
  }

  // only some prompt values are allowed
  if (![undefined, "consent", "select_account"].includes(params.prompt)) {
    return false;
  }

  // any other response_type includes the id_token, which is not allowed in
  // OAuth2 requests
  if (!["code", "token"].includes(params.response_type as string)) {
    return false;
  }

  return true;
}

function parseClaims(
  params: AuthorizationRequest,
  raw: Record<string, string | undefined>,
) {
  if (raw.claims) {
    try {
      params.claims = claimsSchema.parse(JSON.parse(raw.claims));
    } catch {
      return false;
    }
  }

  return true;
}

function parseMaxAge(
  params: AuthorizationRequest,
  raw: Record<string, string | undefined>,
) {
  if (raw.max_age !== undefined) {
    params.max_age = parseInt(raw.max_age);
    if (isNaN(params.max_age) || params.max_age < 0) {
      return false;
    }
  }

  return true;
}

const SCOPES_TO_CLAIMS: Record<string, string[]> = {
  profile: [
    "name",
    "family_name",
    "given_name",
    "middle_name",
    "nickname",
    "preferred_username",
    "profile",
    "picture",
    "website",
    "gender",
    "birthdate",
    "zoneinfo",
    "locale",
    "updated_at",
  ],
  email: ["email", "email_verified"],
  phone: ["phone_number", "phone_number_verified"],
  address: ["address"],
};

function scopesToClaims(params: AuthorizationRequest) {
  for (const scope of params.scopes) {
    if (!SCOPES_TO_CLAIMS[scope]) {
      continue;
    }

    const newClaims = SCOPES_TO_CLAIMS[scope].map((claim) => [claim, null]);

    params.claims = {
      ...params.claims,

      userinfo: {
        ...Object.fromEntries(newClaims),
        ...params.claims?.userinfo,
      },
    };
  }
}

/**
 * Return the sub claim from the id_token_hint. The id_token must be signed by
 * this server, have the correct issuer, and is allowed to be expired.
 *
 * @param idTokenHint - The id_token_hint parameter from the request.
 * @param issuer - The expected issuer of the id_token.
 * @param alg - The algorithm that the client requested for the id_token signature.
 * @returns The sub claim from the id_token, or undefined if the id_token is invalid.
 */
async function extractIdTokenSub(
  idTokenHint: string | undefined,
  issuer: string,
  alg: string,
) {
  if (!idTokenHint) {
    return undefined;
  }

  const claims = await decodeIdToken(idTokenHint, {
    alg,
    allowExpired: true,
    issuer,
  });
  if (claims.isErr()) {
    return undefined;
  }

  return claims.value.sub as string;
}
