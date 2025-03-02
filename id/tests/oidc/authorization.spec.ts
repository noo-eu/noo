import { test, expect } from "@playwright/test";

test.describe("OpenID Authorization endpoint", () => {
  const basicRequest = {
    client_id: "00000000-0000-0000-0000-000000000001",
    response_type: "code",
    redirect_uri: "https://localhost:22999/cb",
    scope: "openid",
    state: "state",
    nonce: "nonce",
  };

  // test("works with a POST request", async ({ request }) => {
  //   const response = await request.post(`/oidc/authorize`, {
  //     data: new URLSearchParams(basicRequest),
  //     headers: {
  //       "Content-Type": "application/x-www-form-urlencoded",
  //     },
  //   });
  // });

  test.describe("prompt not set", () => {
    test.describe("no active session, consent not yet given", () => {
      test("authenticates, obtains consent, and redirects to the client", async ({
        page,
      }) => {
        await page.goto(
          `/oidc/authorize?${new URLSearchParams(basicRequest).toString()}`,
        );

        await expect(page.getByText("Sign in")).toBeDefined();

        await page.fill('input[name="username"]', "johndoe1");
        await page.fill('input[name="password"]', "super-s3cret");
        await page.getByTestId("signinSubmit").click();

        await expect(page.getByText("Consent")).toBeVisible();
      });
    });
  });
});
