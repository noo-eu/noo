import { expect, test } from "@playwright/test";

test.describe("Signin", () => {
  test("Happy path", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[name="username"]', "jo.Hn.doE1");
    await page.fill('input[name="password"]', "super-s3cret");
    await page.getByTestId("signinSubmit").click();

    await expect(page.getByText("Manage your privacy settings")).toBeVisible();
  });

  test("Bad credentials", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[name="username"]', "i..mpossible");
    await page.fill('input[name="password"]', "badpassword");
    await page.getByTestId("signinSubmit").click();

    await expect(
      page.getByText("The details you entered are incorrect"),
    ).toBeVisible();
  });

  test.describe("Continue URL", () => {
    test("redirects to continue URL when it starts with /", async ({
      page,
    }) => {
      await page.goto("/signin?continue=/settings");

      await page.fill('input[name="username"]', "jo.Hn.doE1");
      await page.fill('input[name="password"]', "super-s3cret");
      await page.getByTestId("signinSubmit").click();

      await page.waitForURL("**/settings");
    });

    test("it is ignored when it doesn't start with /", async ({ page }) => {
      await page.goto("/signin?continue=https://evil.com");

      await page.fill('input[name="username"]', "jo.Hn.doE1");
      await page.fill('input[name="password"]', "super-s3cret");
      await page.getByTestId("signinSubmit").click();

      await page.waitForURL("https://localhost:23000/");
    });

    test("it persists after a failed signin", async ({ page }) => {
      await page.goto("/signin?continue=/settings");

      await page.fill('input[name="username"]', "i..mpossible");
      await page.fill('input[name="password"]', "badpassword");
      await page.getByTestId("signinSubmit").click();

      await page.fill('input[name="username"]', "jo.Hn.doE1");
      await page.fill('input[name="password"]', "super-s3cret");
      await page.getByTestId("signinSubmit").click();

      await page.waitForURL("**/settings");
    });
  });
});
