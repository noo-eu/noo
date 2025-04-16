import { type Locator, type Page, expect } from "@playwright/test";

export class SignInTotpPage {
  readonly page: Page;
  readonly codeInput: Locator;
  readonly continueButton: Locator;
  readonly errorMessage: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByText("Enter the code from your authenticator app");
    this.codeInput = page.getByLabel("Code");
    this.continueButton = page.getByTestId("totpSubmit");
    this.errorMessage = page.getByTestId("signinTotpErrorMessage");
  }

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.codeInput).toBeVisible();
    await expect(this.continueButton).toBeVisible();
  }

  async enterCode(code: string) {
    await this.codeInput.fill(code);
    await this.continueButton.click();
  }

  async expectError() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(/[\w\s]+/i);
  }
}
