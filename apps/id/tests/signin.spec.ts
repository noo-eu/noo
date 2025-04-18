import { expect, test } from "@playwright/test";
import { SignInPage } from "./pages/SignInPage";
import { ProfileHubPage } from "./pages/ProfileHubPage";
import { SignInTotpPage } from "./pages/SignInTotpPage";
import { generateTotp } from "~/lib.server/totp";

test.describe("Signing in", () => {
  test("Happy path", async ({ page }) => {
    const signInPage = new SignInPage(page);
    const profileHubPage = new ProfileHubPage(page);

    await signInPage.visit();
    await signInPage.signIn("johndoe1", "super-s3cret");

    await profileHubPage.expectToBeVisible();
  });

  test("Bad credentials", async ({ page }) => {
    const signInPage = new SignInPage(page);

    await signInPage.visit();
    await signInPage.signIn("i..mpossible", "wrongpassword");

    await signInPage.expectError("The details you entered are incorrect");
  });

  test.describe("When the user has an OTP device", () => {
    test("Happy path", async ({ page }) => {
      const signInPage = new SignInPage(page);
      const totpPage = new SignInTotpPage(page);
      const profileHubPage = new ProfileHubPage(page);

      await signInPage.visit();
      await signInPage.signIn("janetotp", "super-s3cret");

      await totpPage.expectToBeVisible();

      const secret = "AAAAAAAABBBBBBBB";
      const code = generateTotp(secret);
      await totpPage.enterCode(code);

      await profileHubPage.expectToBeVisible();
    });

    test("Bad OTP", async ({ page }) => {
      const signInPage = new SignInPage(page);
      const totpPage = new SignInTotpPage(page);

      await signInPage.visit();

      // Use a different user for failing TOTP, to avoid getting rate limited on
      // the Happy path test.
      await signInPage.signIn("janetotp2", "super-s3cret");

      await totpPage.expectToBeVisible();
      await totpPage.enterCode("123");

      await totpPage.expectError();
    });

    test.only("Bad OTP eventually triggers rate limiting", async ({ page }) => {
      const signInPage = new SignInPage(page);
      const totpPage = new SignInTotpPage(page);

      await signInPage.visit();

      // Use a different user for failing TOTP, to avoid getting rate limited on
      // the Happy path test.
      await signInPage.signIn("janetotp2", "super-s3cret");

      await totpPage.expectToBeVisible();

      for (let i = 0; i < 5; i++) {
        await totpPage.enterCode("123");
      }

      await totpPage.expectError();
      await expect(totpPage.errorMessage).toHaveText(/Please try again in/);
    });
  });
});
