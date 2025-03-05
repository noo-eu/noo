import { uuidToHumanId } from "@/utils";
import { expect, test } from "@playwright/test";

test.describe("Private provider", () => {
  test.describe("RP Initiated logout", () => {
    test("Allows logout", async ({ page }) => {
      await page.goto(`/signin`);

      await page.fill('input[name="username"]', "johndoe1");
      await page.fill('input[name="password"]', "super-s3cret");
      await page.getByTestId("signinSubmit").click();

      // Even if the session wasn't started by the RP, the RP can still request
      // a logout... weird
      const clientId = uuidToHumanId(
        "00000000-0000-0000-0000-000000000002",
        "oidc",
      );
      await page.goto("/oidc/acme.fr/end_session?client_id=" + clientId);

      await expect(
        page.getByText("You signed out from Acme Sarl's app"),
      ).toBeVisible();
      await expect(page.getByText("Yes")).toBeVisible();

      await page.getByText("Yes").click();

      // We should be back at the sign in page
      await expect(page.getByTestId("signinSubmit")).toBeVisible();
    });
  });
});
