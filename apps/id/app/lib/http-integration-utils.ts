import { uuidToHumanId } from "@noo/lib/humanIds";
import type { SuperTest, Test } from "supertest";
import request from "supertest";
import { createTestServer } from "./test-server";
import KeyValueStore from "~/db.server/key_value_store";

// Test client ID matching the fixture data
export const TEST_CLIENT_ID = uuidToHumanId(
  "00000000-0000-0000-0000-000000000001",
  "oidc",
);

export interface OidcAuthRequest {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope: string;
  state: string;
  nonce: string;
  [key: string]: string;
}

export interface AuthenticatedSession {
  cookies: string[];
  userId: string;
}

/**
 * Creates a standard OIDC authorization request object
 */
export function makeOidcAuthRequest(
  overrides: Partial<OidcAuthRequest> = {},
): OidcAuthRequest {
  return {
    client_id: TEST_CLIENT_ID,
    response_type: "code",
    redirect_uri: "https://localhost:22999/cb",
    scope: "openid profile",
    state: `state-${Date.now()}`,
    nonce: `nonce-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Clears PoW (Proof-of-Work) state for testing to prevent anti-brute-force measures
 */
export async function clearPowState(ip: string = "0.0.0.0"): Promise<void> {
  await KeyValueStore.destroy(`${ip}:pow`);
}

/**
 * Creates a supertest instance for the test server
 */
export async function createTestClient(): Promise<SuperTest<Test>> {
  const app = await createTestServer();
  return request(app);
}

/**
 * Authenticates a user via HTTP and returns session information
 */
export async function authenticateUser(
  client: SuperTest<Test>,
  username: string = "jo.Hn.doE1",
  password: string = "super-s3cret",
): Promise<AuthenticatedSession> {
  // Clear PoW state to prevent anti-brute-force measures in tests
  await clearPowState();

  // Note: Fixtures use password "super-s3cret" (not "super-s3cr3t")

  // First get the signin page
  const signinResponse = await client.get("/signin");

  let cookies: string[] = [];
  if (signinResponse.headers["set-cookie"]) {
    cookies = Array.isArray(signinResponse.headers["set-cookie"])
      ? signinResponse.headers["set-cookie"]
      : [signinResponse.headers["set-cookie"]];
  }

  // Sign in with form data
  const loginResponse = await client
    .post("/signin")
    .set("Cookie", cookies)
    .type("form")
    .send({
      username,
      password,
    });

  // Collect all cookies from the authentication flow
  if (loginResponse.headers["set-cookie"]) {
    const newCookies = Array.isArray(loginResponse.headers["set-cookie"])
      ? loginResponse.headers["set-cookie"]
      : [loginResponse.headers["set-cookie"]];
    cookies = [...cookies, ...newCookies];
  }

  // Check for successful authentication
  if (loginResponse.status >= 400) {
    throw new Error(
      `Authentication failed: ${loginResponse.status} ${loginResponse.text}`,
    );
  }

  // Debug authentication result
  console.log(`Authentication response: ${loginResponse.status}`);
  console.log(`Response body: ${loginResponse.text}`);
  console.log(`Final cookies: ${JSON.stringify(cookies)}`);

  return {
    cookies,
    userId: username, // For tests, we'll use username as userId
  };
}

/**
 * Performs an OIDC authorization request via HTTP and returns the response
 */
export async function performAuthorizationRequest(
  client: SuperTest<Test>,
  authRequest: OidcAuthRequest,
  session?: AuthenticatedSession,
): Promise<request.Response> {
  const cookies = session ? session.cookies : [];
  const authorizeUrl = `/oidc/authorize?${new URLSearchParams(authRequest).toString()}`;

  console.log(`Making authorization request to: ${authorizeUrl}`);
  console.log(`With cookies: ${JSON.stringify(cookies)}`);

  const response = await client.get(authorizeUrl).set("Cookie", cookies);

  console.log(
    `Authorization response: ${response.status} -> ${response.headers.location}`,
  );

  return response;
}

/**
 * Extracts authorization code from a redirect response
 */
export function extractAuthorizationCode(
  response: request.Response,
  expectedState: string,
): { code: string; state: string } {
  if (response.status !== 302) {
    throw new Error(`Expected redirect, got status ${response.status}`);
  }

  const location = response.headers.location;
  if (!location) {
    throw new Error("No location header in redirect response");
  }

  // Handle both absolute and relative URLs
  let url: URL;
  try {
    url = new URL(location);
  } catch {
    // If it's a relative URL, create a full URL
    url = new URL(location, "https://localhost:22999");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    throw new Error(`No authorization code in redirect URL: ${location}`);
  }

  if (state !== expectedState) {
    throw new Error(`State mismatch: expected ${expectedState}, got ${state}`);
  }

  return { code, state };
}

/**
 * Handles the consent flow via HTTP
 */
export async function giveConsent(
  client: SuperTest<Test>,
  consentUrl: string,
  session: AuthenticatedSession,
): Promise<request.Response> {
  // First get the consent page
  const consentPageResponse = await client
    .get(consentUrl)
    .set("Cookie", session.cookies);

  if (consentPageResponse.status !== 200) {
    throw new Error(
      `Failed to get consent page: ${consentPageResponse.status}`,
    );
  }

  // Submit consent approval
  return await client
    .post(consentUrl)
    .set("Cookie", session.cookies)
    .type("form")
    .send({ approve: "true" });
}

/**
 * Exchanges authorization code for access token via HTTP
 */
export async function exchangeCodeForToken(
  client: SuperTest<Test>,
  authRequest: OidcAuthRequest,
  code: string,
  extraParams: Record<string, string> = {},
): Promise<any> {
  const httpBasicCredentials = `${authRequest.client_id}:super-s3cret`;
  const tokenAuth = Buffer.from(httpBasicCredentials).toString("base64");

  const tokenResponse = await client
    .post("/oidc/token")
    .set("Authorization", `Basic ${tokenAuth}`)
    .type("form")
    .send({
      client_id: authRequest.client_id,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: authRequest.redirect_uri,
      ...extraParams,
    });

  if (tokenResponse.status !== 200) {
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} ${tokenResponse.text}`,
    );
  }

  return tokenResponse.body;
}

/**
 * Fetches user info using access token via HTTP
 */
export async function fetchUserInfo(
  client: SuperTest<Test>,
  accessToken: string,
): Promise<any> {
  const userinfoResponse = await client
    .get("/oidc/userinfo")
    .set("Authorization", `Bearer ${accessToken}`);

  if (userinfoResponse.status !== 200) {
    throw new Error(
      `Userinfo request failed: ${userinfoResponse.status} ${userinfoResponse.text}`,
    );
  }

  return userinfoResponse.body;
}
