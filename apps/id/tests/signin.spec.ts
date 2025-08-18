import { expect, test } from "@playwright/test";
import { SignInPage } from "./pages/SignInPage";
import { ProfileHubPage } from "./pages/ProfileHubPage";
import { SignInTotpPage } from "./pages/SignInTotpPage";
import { generateTotp } from "~/lib.server/totp";
import KeyValueStore from "~/db.server/key_value_store";

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

    test("Bad OTP eventually triggers rate limiting", async ({ page }) => {
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

  test.describe("PoW Anti-Brute-Force Protection", () => {
    test("triggers PoW challenge after failed signin attempts", async ({
      page,
    }) => {
      const signInPage = new SignInPage(page);

      await signInPage.visit();

      // Make multiple failed signin attempts to trigger PoW
      for (let i = 0; i < 4; i++) {
        await signInPage.signIn("powtest", "wrongpassword");
        await signInPage.expectError("The details you entered are incorrect");

        // Navigate back to signin to reset form
        await signInPage.visit();
      }

      // Check for PoW-related elements or JavaScript behavior
      // Since PoW runs in a web worker, we need to check for the presence
      // of hidden form fields that indicate PoW is active
      await expect(page.locator('input[name="powRequest"]')).toBeAttached();

      // Check that the noscript message is shown
      await expect(page.locator("noscript")).toContainText("enable JavaScript");
    });

    test("successful signin works after PoW is required", async ({ page }) => {
      const signInPage = new SignInPage(page);
      const profileHubPage = new ProfileHubPage(page);

      // First trigger PoW by failing multiple times
      await signInPage.visit();
      for (let i = 0; i < 4; i++) {
        await signInPage.signIn("powtest2", "wrongpassword");
        await signInPage.expectError("The details you entered are incorrect");
        await signInPage.visit();
      }

      // Now try with correct credentials - should work despite PoW being required
      await signInPage.signIn("johndoe1", "super-s3cret");

      // Should successfully sign in (PoW should be computed automatically by JS)
      await profileHubPage.expectToBeVisible();
    });

    test.afterEach(async () => {
      // Clean up PoW state for the test IPs to avoid test interference
      await KeyValueStore.destroy("127.0.0.1:pow");
      await KeyValueStore.destroy("::1:pow");
      await KeyValueStore.destroy("0.0.0.0:pow");
    });
  });
});
