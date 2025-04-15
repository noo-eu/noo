import { uuidToHumanId } from "@noo/lib/humanIds";
import { expect, test } from "@playwright/test";
import { waitForCondition } from "tests/e2e-support";
import { ConsentPage } from "tests/pages/ConsentPage";
import { SignInPage } from "tests/pages/SignInPage";
import { TokenEndpoint } from "tests/pages/TokenEndpoint";
import { UserinfoEndpoint } from "tests/pages/UserinfoEndpoint";

test.describe("OpenID Provider", () => {
  test.describe("Authorization Code Flow", () => {
    const humanClientId = uuidToHumanId(
      "00000000-0000-0000-0000-000000000001",
      "oidc",
    );

    const basicRequest = {
      client_id: humanClientId,
      response_type: "code",
      redirect_uri: "https://localhost:22999/cb",
      scope: "openid profile",
      state: "state",
      nonce: "nonce",
    };

    test.describe("prompt not set", () => {
      test.describe("no active session, consent not yet given", () => {
        test("authenticates, obtains consent, and redirects to the client", async ({
          page,
          request,
        }) => {
          const authorizeUrl = `/oidc/authorize?${new URLSearchParams(basicRequest).toString()}`;
          await page.goto(authorizeUrl);

          const signInPage = new SignInPage(page);
          const consentPage = new ConsentPage(page);
          const token = new TokenEndpoint(request);
          const userinfo = new UserinfoEndpoint(request);

          let code: string | null = null;
          let state: string | null = null;

          // Install a route handler to intercept the callback
          // and extract the code and state parameters
          // from the URL
          await page.route("**/cb*", async (route) => {
            expect(route.request().method()).toBe("GET");

            const url = new URL(route.request().url());
            state = url.searchParams.get("state");
            code = url.searchParams.get("code");

            console.log("code", code);
            console.log("state", state);

            await route.fulfill({
              status: 200,
              contentType: "text/plain",
              body: "Callback",
            });
          });

          await signInPage.expectToBeVisible();
          await signInPage.signIn("johndoe1", "super-s3cret");

          await consentPage.expectToBeVisible();
          await consentPage.approve();

          // Wait for the route handler to be called
          await waitForCondition(() => code !== null);

          expect(code).toBeDefined();
          expect(state).toBe("state");

          // Exchange the code for an access token
          const httpBasicCredentials = `${humanClientId}:super-s3cret`;
          const tokenAuth =
            Buffer.from(httpBasicCredentials).toString("base64");
          const tokenResponse = await token.post(
            {
              grant_type: "authorization_code",
              code: code!,
              redirect_uri: basicRequest.redirect_uri,
              client_id: basicRequest.client_id,
            },
            { Authorization: `Basic ${tokenAuth}` },
          );

          expect(tokenResponse).toMatchObject({
            access_token: expect.any(String),
            token_type: "Bearer",
            id_token: expect.any(String),
            expires_in: 3600,
          });

          // We've only requested the "openid profile" scope, so we should get
          // the "sub" claim, and a few basic profile claims
          const userinfoResponse = await userinfo.get(
            tokenResponse.access_token,
          );
          expect(userinfoResponse).toMatchObject({
            sub: expect.any(String),
            name: expect.any(String),
          });
        });
      });
    });
  });
});
