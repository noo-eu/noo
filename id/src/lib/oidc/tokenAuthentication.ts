import { OidcClient } from "@/db/oidc_clients";
import { HttpRequest } from "../http/request";
import * as jose from "jose";

export async function authenticateClient(req: HttpRequest, client: OidcClient) {
  switch (client.tokenEndpointAuthMethod) {
    case "client_secret_basic":
      return authenticateClientSecretBasic(req, client);
    case "client_secret_post":
      return await authenticateClientSecretPost(req, client);
    case "client_secret_jwt":
      return await authenticateClientSecretJwt(req, client);
    case "private_key_jwt":
      throw new Error("private_key_jwt is not implemented");
    case "none":
      // The Client does not authenticate itself at the Token Endpoint, either
      // because it uses only the Implicit Flow (and so does not use the Token
      // Endpoint) or because it is a Public Client with no Client Secret or
      // other authentication mechanism.
      return true;
    default:
      return false;
  }
}

export function authenticateClientSecretBasic(
  req: HttpRequest,
  client: OidcClient,
) {
  if (!req.authorization) {
    return false;
  }

  const [method, token] = req.authorization.split(" ");
  if (method !== "Basic") {
    return false;
  }

  const [clientId, clientSecretEncoded] = Buffer.from(token, "base64")
    .toString()
    .split(":");

  // The clientSecret may be URL encoded
  const clientSecret = decodeURIComponent(clientSecretEncoded);
  return clientId === client.id && clientSecret === client.clientSecret;
}

export async function authenticateClientSecretPost(
  req: HttpRequest,
  client: OidcClient,
) {
  if (!req.isPost() || !req.isFormData()) {
    return false;
  }

  const params = await req.formParams;
  return (
    params.client_id === client.id &&
    params.client_secret === client.clientSecret
  );
}

export async function authenticateClientSecretJwt(
  req: HttpRequest,
  client: OidcClient,
) {
  if (!req.isPost() || !req.isFormData()) {
    return false;
  }

  const params = await req.formParams;

  const client_assertion_type = params.client_assertion_type;
  if (
    client_assertion_type !==
    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  ) {
    return false;
  }

  const client_assertion = params.client_assertion;
  if (!client_assertion) {
    return false;
  }

  try {
    await jose.jwtVerify(
      client_assertion,
      new TextEncoder().encode(client.clientSecret),
      {
        audience: `${req.baseUrl}/oidc/token`,
        issuer: client.id,
        subject: client.id,
      },
    );
  } catch (e) {
    return false;
  }

  return true;
}
