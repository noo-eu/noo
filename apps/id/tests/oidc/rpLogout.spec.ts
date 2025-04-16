import { expect, test } from "@playwright/test";
import { ProfileHubPage } from "tests/pages/ProfileHubPage";
import { SignInPage } from "tests/pages/SignInPage";

test.describe("Private provider", () => {
  test.describe("RP Initiated logout", () => {
    test("Allows logout", async ({ page }) => {
      const signInPage = new SignInPage(page);
      const profileHubPage = new ProfileHubPage(page);

      await signInPage.visit();
      await signInPage.signIn("johndoe1", "super-s3cret");
      await profileHubPage.expectToBeVisible();

      // Even if the session wasn't started by the RP, the RP can still request
      // a logout... :shrug:
      await page.goto("/oidc/org_1/end-session?client_id=oidc_2");

      await expect(
        page.getByText("You signed out from Acme Sarl's app"),
      ).toBeVisible();

      await expect(page.getByText("Yes")).toBeVisible();
      await page.getByText("Yes").click();

      // We should be back at the sign in page
      await signInPage.expectToBeVisible();
    });
  });
});
