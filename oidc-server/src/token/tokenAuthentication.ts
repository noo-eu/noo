import { jwtVerify } from "jose";
import configuration, { Client } from "../configuration";

export async function authenticateClient(req: Request, client: Client) {
  switch (client.tokenEndpointAuthMethod) {
    case "client_secret_basic":
      return authenticateClientSecretBasic(req, client);
    case "client_secret_post":
      return await authenticateClientSecretPost(req, client);
    case "client_secret_jwt":
      return await authenticateClientSecretJwt(req, client);
    case "none":
      // The Client does not authenticate itself at the Token Endpoint, either
      // because it uses only the Implicit Flow (and so does not use the Token
      // Endpoint) or because it is a Public Client with no Client Secret or
      // other authentication mechanism.
      return true;
    case "private_key_jwt":
    default:
      throw new Error(
        `Unsupported token endpoint auth method: ${client.tokenEndpointAuthMethod}`,
      );
  }
}

export function authenticateClientSecretBasic(req: Request, client: Client) {
  const authorizationHeader = getAuthorizationHeader(req);
  if (!authorizationHeader) {
    return false;
  }

  const [method, token] = authorizationHeader.split(" ");
  if (method !== "Basic") {
    return false;
  }

  const [clientId, clientSecretEncoded] = Buffer.from(token, "base64")
    .toString()
    .split(":");

  // The clientSecret may be URL encoded
  const clientSecret = decodeURIComponent(clientSecretEncoded);
  return clientId === client.clientId && clientSecret === client.clientSecret;
}

export async function authenticateClientSecretPost(
  req: Request,
  client: Client,
) {
  if (
    req.method != "POST" ||
    !req.headers
      .get("Content-Type")
      ?.startsWith("application/x-www-form-urlencoded")
  ) {
    return false;
  }

  const params = Object.fromEntries((await req.formData()).entries());
  const clientId = params.client_id?.valueOf();
  if (!clientId || typeof clientId !== "string") {
    return false;
  }

  const clientSecret = params.client_secret?.valueOf();
  if (!clientSecret || typeof clientSecret !== "string") {
    return false;
  }

  return (
    clientId === client.clientId && params.client_secret === client.clientSecret
  );
}

export async function authenticateClientSecretJwt(
  req: Request,
  client: Client,
) {
  if (
    req.method != "POST" ||
    !req.headers
      .get("Content-Type")
      ?.startsWith("application/x-www-form-urlencoded")
  ) {
    return false;
  }

  const params = Object.fromEntries((await req.formData()).entries());
  console.log(params);

  const client_assertion_type = params.client_assertion_type?.toString();
  if (
    client_assertion_type !==
    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  ) {
    return false;
  }

  const client_assertion = params.client_assertion?.valueOf();
  if (!client_assertion || typeof client_assertion !== "string") {
    return false;
  }

  try {
    const claims = await jwtVerify(
      client_assertion,
      new TextEncoder().encode(client.clientSecret),
      {
        audience: `${configuration.baseUrl}/token`,
        issuer: client.clientId,
        subject: client.clientId,
      },
    );

    console.log("Claims", claims);
  } catch {
    return false;
  }

  return true;
}

function getAuthorizationHeader(req: Request) {
  return req.headers.get("Authorization");
}
