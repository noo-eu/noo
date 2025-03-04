import { uuidToHumanId } from "@/utils";
import { expect, test } from "@playwright/test";

test.describe("OpenID Authorization endpoint", () => {
  const basicRequest = {
    client_id: uuidToHumanId("00000000-0000-0000-0000-000000000001", "oidc"),
    response_type: "code",
    redirect_uri: "https://localhost:22999/cb",
    scope: "openid",
    state: "state",
    nonce: "nonce",
  };

  test.describe("prompt not set", () => {
    test.describe("no active session, consent not yet given", () => {
      test("authenticates, obtains consent, and redirects to the client", async ({
        page,
        request,
      }) => {
        await page.goto(
          `/oidc/authorize?${new URLSearchParams(basicRequest).toString()}`,
        );

        await expect(page.getByText("Sign in")).toBeDefined();

        await page.fill('input[name="username"]', "johndoe1");
        await page.fill('input[name="password"]', "super-s3cret");
        await page.getByTestId("signinSubmit").click();

        await expect(page.getByText("Test Public OIDC Client")).toBeVisible();

        await page.getByText("Continue").click();

        await expect(page.getByText('"method"')).toBeVisible();

        // Get the body tag
        const body = (await (
          await page.waitForSelector("body")
        ).textContent())!;
        const response = JSON.parse(body);

        expect(response).toMatchObject({
          method: "GET",
          query: {
            code: expect.any(String),
            state: "state",
          },
        });

        // Exchange the code for an access token
        const tokenResponse = await request.post("/oidc/token", {
          data: new URLSearchParams({
            grant_type: "authorization_code",
            code: response.query.code,
            redirect_uri: basicRequest.redirect_uri,
            client_id: basicRequest.client_id,
          }).toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
              "00000000-0000-0000-0000-000000000001:super-s3cret",
            ).toString("base64")}`,
          },
        });

        const tokenBody = await tokenResponse.json();
        expect(tokenBody).toMatchObject({
          access_token: expect.any(String),
          token_type: "Bearer",
          id_token: expect.any(String),
          expires_in: 3600,
        });

        // Now fetch the userinfo
        const userinfoResponse = await request.get("/oidc/userinfo", {
          headers: {
            Authorization: `Bearer ${tokenBody.access_token}`,
          },
        });

        // We've only requested the "openid" scope, so we should only get the
        // "sub" claim, no name or email.
        const userinfoBody = await userinfoResponse.json();
        expect(userinfoBody).toMatchObject({
          sub: expect.any(String),
        });
      });
    });
  });
});
