import { expect, test } from "@playwright/test";

test.describe("Signin", () => {
  test.skip("Happy path", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[name="username"]', "jo.Hn.doE1");
    await page.fill('input[name="password"]', "super-s3cret");
    await page.getByTestId("signinSubmit").click();

    await expect(page.getByText("Manage your privacy settings")).toBeVisible();
  });

  test.skip("Bad credentials", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[name="username"]', "i..mpossible");
    await page.fill('input[name="password"]', "badpassword");
    await page.getByTestId("signinSubmit").click();

    await expect(
      page.getByText("The details you entered are incorrect"),
    ).toBeVisible();
  });
});
