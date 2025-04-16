import { uuidToHumanId } from "@noo/lib/humanIds";
import { expect, test } from "@playwright/test";
import {
  makeOidcAuthRequest,
  startOidcFlow,
  signInAndConsent,
  completeOidcFlow,
  visitOidcAuthorization,
} from "./utils";
import { SignInPage } from "tests/pages/SignInPage";
import { ConsentPage } from "tests/pages/ConsentPage";
import { ProfileHubPage } from "tests/pages/ProfileHubPage";

const client_id = uuidToHumanId("00000000-0000-0000-0000-000000000001", "oidc");

test.describe("OpenID Provider", () => {
  test.describe("Authorization Code Flow", () => {
    test("basic authorization code flow", async ({ page, request }) => {
      const authRequest = makeOidcAuthRequest({ client_id });

      const callbackRequest = await startOidcFlow(page, async () => {
        await signInAndConsent(page, authRequest);
      });

      expect(callbackRequest.method()).toBe("GET");
      const callbackUri = new URL(callbackRequest.url());
      const code = callbackUri.searchParams.get("code");
      const state = callbackUri.searchParams.get("state");

      expect(code).toBeDefined();
      expect(state).toBe(authRequest.state);

      // Exchange the code for an access token
      const { userinfo } = await completeOidcFlow(request, authRequest, {
        code: code!,
      });

      // We've only requested the "openid profile" scope, so we should get the
      // "sub" claim, and a few basic profile claims
      expect(userinfo).toMatchObject({
        sub: expect.any(String),
        name: expect.any(String),
      });
    });

    test("basic authorization code flow with PKCE", async ({
      page,
      request,
    }) => {
      const randomChallenge = `challenge-${Math.random().toString(16).slice(2)}`;
      const authRequest = makeOidcAuthRequest({
        client_id,
      });

      const callbackRequest = await startOidcFlow(page, async () => {
        await signInAndConsent(page, authRequest);
      });

      expect(callbackRequest.method()).toBe("GET");
      const callbackUri = new URL(callbackRequest.url());
      const code = callbackUri.searchParams.get("code");
      const state = callbackUri.searchParams.get("state");

      expect(code).toBeDefined();
      expect(state).toBe(authRequest.state);

      // Exchange the code for an access token
      const { userinfo } = await completeOidcFlow(request, authRequest, {
        code: code!,
        code_verifier: randomChallenge,
      });

      // We've only requested the "openid profile" scope, so we should get the
      // "sub" claim, and a few basic profile claims
      expect(userinfo).toMatchObject({
        sub: expect.any(String),
        name: expect.any(String),
      });
    });

    test.describe("already signed in test", () => {
      test("doesn't require signing in again", async ({ page }) => {
        const signInPage = new SignInPage(page);
        const profileHubPage = new ProfileHubPage(page);

        await signInPage.visit();
        await signInPage.signIn("johndoe1", "super-s3cret");

        // Without an active Authorization request, we should be redirected to the
        // profile hub page as a fallback.
        await profileHubPage.expectToBeVisible();

        const authRequest = makeOidcAuthRequest({
          client_id,
        });

        const callbackRequest = await startOidcFlow(page, async () => {
          await visitOidcAuthorization(page, authRequest);

          // There's no requirement for signing in again, so we should
          // go straight to the consent page.
          const consentPage = new ConsentPage(page);
          await consentPage.expectToBeVisible();
          await consentPage.approve();
        });

        expect(callbackRequest.method()).toBe("GET");
        const callbackUri = new URL(callbackRequest.url());
        const code = callbackUri.searchParams.get("code");
        const state = callbackUri.searchParams.get("state");

        expect(code).toBeDefined();
        expect(state).toBe(authRequest.state);
      });

      test("prompt=login forces sign in", async ({ page }) => {
        const signInPage = new SignInPage(page);
        const profileHubPage = new ProfileHubPage(page);

        await signInPage.visit();
        await signInPage.signIn("johndoe1", "super-s3cret");

        // Without an active Authorization request, we should be redirected to the
        // profile hub page as a fallback.
        await profileHubPage.expectToBeVisible();

        const authRequest = makeOidcAuthRequest({
          client_id,
          prompt: "login",
        });

        const callbackRequest = await startOidcFlow(page, async () => {
          await signInAndConsent(page, authRequest);
        });

        expect(callbackRequest.method()).toBe("GET");
        const callbackUri = new URL(callbackRequest.url());
        const code = callbackUri.searchParams.get("code");
        const state = callbackUri.searchParams.get("state");

        expect(code).toBeDefined();
        expect(state).toBe(authRequest.state);
      });

      test("max_age=1 forces sign in (after 1s)", async ({ page }) => {
        const signInPage = new SignInPage(page);
        const profileHubPage = new ProfileHubPage(page);

        await signInPage.visit();
        await signInPage.signIn("johndoe1", "super-s3cret");

        // Without an active Authorization request, we should be redirected to the
        // profile hub page as a fallback.
        await profileHubPage.expectToBeVisible();

        // Wait for 1 second to trigger the max_age=1 requirement
        await page.waitForTimeout(1000);

        const authRequest = makeOidcAuthRequest({
          client_id,
          max_age: "1",
        });

        const callbackRequest = await startOidcFlow(page, async () => {
          await signInAndConsent(page, authRequest);
        });

        expect(callbackRequest.method()).toBe("GET");
        const callbackUri = new URL(callbackRequest.url());
        const code = callbackUri.searchParams.get("code");
        const state = callbackUri.searchParams.get("state");

        expect(code).toBeDefined();
        expect(state).toBe(authRequest.state);

        // Do it again, with a max_age=100
        const authRequest2 = makeOidcAuthRequest({
          client_id,
          max_age: "100",
        });

        const callbackRequest2 = await startOidcFlow(page, async () => {
          await visitOidcAuthorization(page, authRequest2);

          // There's no requirement for signing in again, so we should
          // go straight to the consent page.
          const consentPage = new ConsentPage(page);
          await consentPage.expectToBeVisible();
          await consentPage.approve();
        });

        expect(callbackRequest2.method()).toBe("GET");
        const callbackUri2 = new URL(callbackRequest2.url());
        const code2 = callbackUri2.searchParams.get("code");
        const state2 = callbackUri2.searchParams.get("state");

        expect(code2).toBeDefined();
        expect(state2).toBe(authRequest2.state);
      });
    });
  });
});
