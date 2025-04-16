import {
  expect,
  type APIRequestContext,
  type Page,
  type Request as PlaywrightRequest,
} from "@playwright/test";
import { waitForCondition } from "tests/e2e-support";
import { ConsentPage } from "tests/pages/ConsentPage";
import { SignInPage } from "tests/pages/SignInPage";
import { TokenEndpoint } from "tests/pages/TokenEndpoint";
import { UserinfoEndpoint } from "tests/pages/UserinfoEndpoint";

export function makeOidcAuthRequest(request: Record<string, string>) {
  return {
    response_type: "code",
    redirect_uri: "https://localhost:22999/cb",
    scope: "openid profile",
    state: `state-${Date.now()}`,
    nonce: `nonce-${Date.now()}`,
    ...request,
  };
}

export async function completeOidcFlow(
  request: APIRequestContext,
  oidcRequest: Record<string, string>,
  extraParams: Record<string, string> = {},
) {
  const token = new TokenEndpoint(request);
  const userinfo = new UserinfoEndpoint(request);

  // Exchange the code for an access token
  const httpBasicCredentials = `${oidcRequest.client_id}:super-s3cret`;
  const tokenAuth = Buffer.from(httpBasicCredentials).toString("base64");
  const tokenResponse = await token.post(
    {
      client_id: oidcRequest.client_id,
      grant_type: "authorization_code",
      redirect_uri: oidcRequest.redirect_uri,
      ...extraParams,
    },
    { Authorization: `Basic ${tokenAuth}` },
  );

  expect(tokenResponse).toMatchObject({
    access_token: expect.any(String),
    token_type: "Bearer",
    id_token: expect.any(String),
    expires_in: 3600,
  });

  return {
    token: tokenResponse,
    userinfo: await userinfo.get(tokenResponse.access_token),
  };
}

export async function startOidcFlow(
  page: Page,
  perform: () => Promise<void>,
): Promise<PlaywrightRequest> {
  let callbackRequest: PlaywrightRequest | null = null;

  // Install a route handler to intercept the callback and extract the code and
  // state parameters from the URL
  await page.route("**/cb*", async (route) => {
    callbackRequest = route.request();

    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "Callback",
    });
  });

  await perform();

  // Wait for the callback request to be made
  await waitForCondition(() => callbackRequest !== null);

  return callbackRequest!;
}

export async function visitOidcAuthorization(
  page: Page,
  requestObject: Record<string, string>,
) {
  const authorizeUrl = `/oidc/authorize?${new URLSearchParams(requestObject).toString()}`;
  await page.goto(authorizeUrl);
}

export async function signInAndConsent(
  page: Page,
  requestObject: Record<string, string>,
) {
  const signInPage = new SignInPage(page);
  const consentPage = new ConsentPage(page);

  await visitOidcAuthorization(page, requestObject);

  await signInPage.expectToBeVisible();
  await signInPage.signIn("johndoe1", "super-s3cret");

  await consentPage.expectToBeVisible();
  await consentPage.approve();
}
