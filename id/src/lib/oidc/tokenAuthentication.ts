import { OidcClient } from "@/db/oidc_clients";
import { HttpRequest } from "../http/request";

export async function authenticateClient(req: HttpRequest, client: OidcClient) {
  switch (client.tokenEndpointAuthMethod) {
    case "client_secret_basic":
      return authenticateClientSecretBasic(req, client);
    case "client_secret_post":
      return await authenticateClientSecretPost(req, client);
    case "client_secret_jwt":
    case "private_key_jwt":
      throw new Error("Unsupported token endpoint authentication method");
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

function authenticateClientSecretBasic(req: HttpRequest, client: OidcClient) {
  if (!req.authorization) {
    return false;
  }

  const [method, token] = req.authorization.split(" ");
  if (method !== "Basic") {
    return false;
  }

  const [clientId, clientSecret] = Buffer.from(token, "base64")
    .toString()
    .split(":");
  return clientId === client.id && clientSecret === client.clientSecret;
}

async function authenticateClientSecretPost(
  req: HttpRequest,
  client: OidcClient,
) {
  const params = await req.formParams;
  return (
    params.client_id === client.id &&
    params.client_secret === client.clientSecret
  );
}
