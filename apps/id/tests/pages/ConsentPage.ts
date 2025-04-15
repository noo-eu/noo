import { type Locator, type Page, expect } from "@playwright/test";

export class ConsentPage {
  readonly page: Page;
  readonly approveButton: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText(/You are signing into/i);
    this.approveButton = page.getByRole("button", { name: /Continue/i });
  }

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.approveButton).toBeVisible();
  }

  async approve() {
    await this.approveButton.click();
  }
}
