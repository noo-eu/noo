import crypto from "node:crypto";
import { sha256 } from "./crypto";

export function beginOidcFlow(callbackUrl: string) {
  const state = crypto.randomBytes(32).toString("base64url");
  const pkce = crypto.randomBytes(32).toString("base64url");
  const nonce = crypto.randomBytes(32).toString("base64url");

  if (!process.env.NOO_ID_PUBLIC_URL) {
    throw new Error("NOO_ID_PUBLIC_URL is not set");
  }

  if (!process.env.NOO_CLIENT_ID) {
    throw new Error("NOO_CLIENT_ID is not set");
  }

  if (!process.env.NOO_CLIENT_SECRET) {
    throw new Error("NOO_CLIENT_SECRET is not set");
  }

  const pkceDigest = sha256(Buffer.from(pkce)).digest("base64url");

  const authEndpoint = new URL(
    `${process.env.NOO_ID_PUBLIC_URL}/oidc/authorize`,
  );
  authEndpoint.searchParams.append("response_type", "code");
  authEndpoint.searchParams.append("client_id", process.env.NOO_CLIENT_ID);
  authEndpoint.searchParams.append("redirect_uri", callbackUrl);
  authEndpoint.searchParams.append("scope", "openid profile");
  authEndpoint.searchParams.append("state", state);
  authEndpoint.searchParams.append("nonce", nonce);
  authEndpoint.searchParams.append("code_challenge", pkceDigest);
  authEndpoint.searchParams.append("code_challenge_method", "S256");

  return {
    state: `${state}:${pkce}`,
    redirectUrl: authEndpoint.toString(),
  };
}

export async function validateOidcCallback(
  request: Request,
  storedState: string | undefined,
  callbackUrl: string,
) {
  const query = new URL(request.url).searchParams;

  const code = query.get("code");
  const state = query.get("state");

  if (!code || !state || !storedState) {
    console.warn("Missing code or state");
    return undefined;
  }

  const [stateCookie, pkce] = storedState.split(":");
  if (state !== stateCookie) {
    console.warn("State mismatch");
    return undefined;
  }

  const response = await fetch(`${process.env.NOO_ID_URL}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(
        process.env.NOO_CLIENT_ID!,
        process.env.NOO_CLIENT_SECRET!,
      ),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
      code,
      code_verifier: pkce,
    }),
  });

  return await response.json();
}

function basicAuth(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}
