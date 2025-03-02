import { schema } from "@/db";
import { findOidcAuthorizationCode } from "@/db/oidc_authorization_codes";
import { findOidcClient } from "@/db/oidc_clients";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parameters: Record<string, string> = {};
  formData.forEach((value, key) => {
    parameters[key] = value.toString();
  });

  switch (parameters.grant_type) {
    case "authorization_code":
      return await authorizationCodeFlow(request, parameters);
    default:
      return Response.json(
        { error: "unsupported_grant_type" },
        { status: 400 },
      );
  }
}

export async function authorizationCodeFlow(
  request: Request,
  parameters: Record<string, string>,
) {
  const code = await findOidcAuthorizationCode(parameters.code);
  if (!code) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const clientId = code.clientId;
  const client = await findOidcClient(clientId);
  if (!client) {
    // Foreign key constraint should prevent this from happening
    return Response.json({ error: "internal_server_error" }, { status: 400 });
  }

  if (!authenticateClient(client, request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  return Response.json({
    access_token: "access_token",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "refresh_token",
    id_token: "id_token",
  });
}

async function authenticateClient(
  client: typeof schema.oidcClients.$inferSelect,
  request: Request,
) {
  switch (client.tokenEndpointAuthMethod) {
    case "client_secret_basic":
      return authenticateClientSecretBasic(client, request);
    case "client_secret_post":
      return await authenticateClientSecretPost(client, request);
    case "client_secret_jwt":
    case "private_key_jwt":
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

function authenticateClientSecretBasic(
  client: typeof schema.oidcClients.$inferSelect,
  request: Request,
) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return false;
  }

  const [method, token] = authorization.split(" ");
  if (method !== "Basic") {
    return false;
  }

  const [clientId, clientSecret] = atob(token).split(":");
  return clientId === client.id && clientSecret === client.clientSecret;
}

async function authenticateClientSecretPost(
  client: typeof schema.oidcClients.$inferSelect,
  request: Request,
) {
  const clientId = (await request.formData()).get("client_id");
  const clientSecret = (await request.formData()).get("client_secret");

  return clientId === client.id && clientSecret === client.clientSecret;
}
