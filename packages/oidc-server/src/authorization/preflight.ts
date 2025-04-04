import { err, ok, Result } from "neverthrow";
import configuration, { Client } from "../configuration";
import {
  RESPONSE_MODES_SUPPORTED,
  RESPONSE_TYPES_SUPPORTED,
} from "../discovery";
import { AuthorizationRequest, ResponseMode, ResponseType } from "../types";

/**
 * Performs early checks on the incoming request to determine if it is valid.
 * Any error at this stage is a critical error that cannot be returned to the
 * client.
 *
 * Some of the parameters may be initially considered valid, and further refined
 * as the request is processed (for example, response_type is restricted under
 * the FAPI2 profile).
 *
 * @param params - The request parameters from the query string or request body.
 * @returns A Result with the loaded client and fully resolved parameters, or an
 * error string.
 */
export async function preflightCheck(
  params: Record<string, string | undefined>,
): Promise<
  Result<
    {
      client: Client;
      params: AuthorizationRequest;
      raw: Record<string, string | undefined>;
    },
    string
  >
> {
  /**
   * Part 1: the client_id and response_type parameters are always required in
   * the query string or request body. The response_type parameter must be
   * valid.
   */

  if (!params.client_id) {
    return err("missing_client_id");
  }

  if (!params.response_type) {
    return err("missing_response_type");
  }

  if (
    !RESPONSE_TYPES_SUPPORTED.includes(params.response_type as ResponseType)
  ) {
    return err("unsupported_response_type");
  }

  /**
   * Part 2: we consider the request and request_uri parameters. Only one of
   * them is allowed. The request object, if present, must be signed and/or
   * encrypted according to the client's preferences.
   *
   * Parameters in the request object take precedence over the parameters in
   * the query string or request body. If client_id or response_type are specified
   * in the request object, they must match the values in the query string or
   * request body.
   */

  const client = await configuration.getClient(params.client_id);
  if (!client) {
    return err("invalid_client_id");
  }

  if (params.request && params.request_uri) {
    // Cannot have both request object and request_uri
    return err("request_and_request_uri");
  }

  if (params.request_uri) {
    // TODO: fetch request_uri, place it in request.request
    return err("request_uri_not_supported");
  }

  if (params.request) {
    // TODO:
    //   1. parse request parameter
    //   2. check that client_id and response_type match with the request
    //   3. merge request object parameters with the current request, object
    //      parameters take precedence
    return err("request_not_supported");
  }

  /**
   * Part 3: the full request object has been resolved.
   *
   * In order to return to the client, whether successful or not, we need to
   * have an acceptable redirect_uri and a response_mode.
   */

  if (!params.redirect_uri) {
    return err("missing_redirect_uri");
  }

  // redirect_uri must be one of the client's registered URIs
  if (!client.redirectUris.includes(params.redirect_uri)) {
    return err("invalid_redirect_uri");
  }

  const response_mode = determineResponseMode(
    params.response_mode,
    params.response_type as ResponseType,
  );
  if (!response_mode) {
    return err("bad_response_mode");
  }

  /**
   * Finished: all further failures can be returned to the client.
   *
   * Return the client and the request parameters.
   */

  params.response_mode = response_mode;
  return ok({
    client,
    params: {
      client_id: params.client_id,
      response_type:
        params.response_type as (typeof RESPONSE_TYPES_SUPPORTED)[number],
      redirect_uri: params.redirect_uri,
      response_mode: response_mode as ResponseMode,
      scopes: params.scope?.split(" ") || [],
      claims: {},
      state: params.state,
      nonce: params.nonce,
      prompt: params.prompt,
      ui_locales: params.ui_locales,
      id_token_hint: params.id_token_hint,
      login_hint: params.login_hint,
      acr_values: params.acr_values,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
      max_age: client.defaultMaxAge,
    },
    raw: params,
  });
}

function determineResponseMode(
  response_mode: string | undefined,
  response_type: ResponseType,
): ResponseMode | undefined {
  // The response mode can be explicitly set by the client
  if (RESPONSE_MODES_SUPPORTED.includes(response_mode as ResponseMode)) {
    return response_mode as ResponseMode;
  } else if (response_mode) {
    // If a response_mode is set but not supported, it's an error
    return undefined;
  }

  // Each response_type has a default response_mode
  switch (response_type) {
    case "code":
      return "query";
    case "id_token":
    case "id_token token":
    case "code id_token":
    case "code token":
    case "code id_token token":
    case "token":
      return "fragment";
  }
}
