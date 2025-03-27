import { SignJWT } from "jose";
import configuration from "./configuration";
import { buildSubClaim } from "./idToken";
import { requestParams } from "./utils";

async function getAccessToken(req: Request) {
  if (req.method === "POST") {
    const params = await requestParams(req);
    if (params.access_token !== undefined) {
      return params.access_token;
    }
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== null) {
    const [type, token] = authHeader.split(" ");
    if (type === "Bearer") {
      return token;
    }
  }
}

export async function handleUserinfo(req: Request) {
  const token = await getAccessToken(req);
  if (!token) {
    return new Response(null, { status: 401 });
  }

  const lookup = await configuration.getAccessToken(token);
  if (!lookup) {
    return new Response(null, { status: 401 });
  }

  const { client, accessToken } = lookup;

  if (!accessToken.scopes.includes("openid")) {
    return new Response(null, { status: 403 });
  }

  const claims: Record<string, unknown> = {
    iss: client.issuer,
    sub: buildSubClaim(client, accessToken.userId),
    aud: client.clientId,
    exp: Math.floor(new Date().getTime() / 1000) + 3600,
    iat: Math.floor(new Date().getTime() / 1000),
    ...(await configuration.getClaims(
      accessToken.userId,
      Object.keys(accessToken.claims.userinfo || {}),
    )),
  };

  if (
    client.userinfoSignedResponseAlg &&
    client.userinfoSignedResponseAlg !== "none"
  ) {
    const { kid, key } = await configuration.getSigningJwk({
      alg: client.userinfoSignedResponseAlg,
    });
    const signed = await new SignJWT(claims)
      .setProtectedHeader({ alg: client.userinfoSignedResponseAlg, kid })
      .sign(key);

    return new Response(signed, {
      headers: {
        "Content-Type": "application/jwt",
      },
    });
  } else {
    return Response.json(claims);
  }
}
