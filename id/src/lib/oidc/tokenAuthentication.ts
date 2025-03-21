import { OidcClient } from "@/db/oidc_clients";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import * as jose from "jose";
import { HttpRequest } from "../http/request";

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

  const clientIdRaw = humanIdToUuid(clientId, "oidc");
  if (!clientIdRaw) {
    return false;
  }

  // The clientSecret may be URL encoded
  const clientSecret = decodeURIComponent(clientSecretEncoded);
  return clientIdRaw === client.id && clientSecret === client.clientSecret;
}

export async function authenticateClientSecretPost(
  req: HttpRequest,
  client: OidcClient,
) {
  if (!req.isPost() || !req.isFormData()) {
    return false;
  }

  const params = await req.formParams;
  const clientIdRaw = humanIdToUuid(params.client_id ?? "", "oidc");
  if (!clientIdRaw) {
    return false;
  }

  return (
    clientIdRaw === client.id && params.client_secret === client.clientSecret
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

  const clientId = uuidToHumanId(client.id, "oidc");

  try {
    await jose.jwtVerify(
      client_assertion,
      new TextEncoder().encode(client.clientSecret),
      {
        audience: `${req.baseUrl}/oidc/token`,
        issuer: clientId,
        subject: clientId,
      },
    );
  } catch {
    return false;
  }

  return true;
}
