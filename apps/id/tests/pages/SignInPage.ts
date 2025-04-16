import { type Locator, type Page, expect } from "@playwright/test";

export class SignInPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signinButton: Locator;
  readonly signinPasskeyButton: Locator;
  readonly heading: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", {
      name: /Sign in to your noo account/i,
    });
    this.usernameInput = page.getByLabel("Username");
    this.passwordInput = page.getByLabel("Password", { exact: true });
    this.signinButton = page.getByTestId("signinSubmit");
    this.signinPasskeyButton = page.getByTestId("signinPasskey");
    this.errorMessage = page.getByTestId("signinErrorMessage");
  }

  async visit() {
    await this.page.goto("/signin");
    await this.expectToBeVisible();
  }

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signinButton).toBeVisible();
  }

  async signIn(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signinButton.click();
  }

  async signInWithPasskey() {
    await this.signinPasskeyButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(message);
  }
}
