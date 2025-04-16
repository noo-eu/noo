import { type Locator, type Page, expect } from "@playwright/test";

export class ProfileHubPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText(/Welcome John/i);
  }

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible();
  }
}
