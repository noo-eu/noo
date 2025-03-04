import { expect, test } from "@playwright/test";

test.describe("Individual signup", () => {
  test("Happy path", async ({ page }) => {
    await page.goto("/signup");

    await page.fill('input[name="first_name"]', "John");
    await page.fill('input[name="last_name"]', "Doe");
    await page.click("text=Next");

    const randomUsername =
      "jane.doe." + Math.random().toString(36).substring(7);
    await page.fill('input[name="username"]', randomUsername);
    await page.click("text=Next");

    await page.fill('input[name="password"]', "password123");
    await page.click("text=Next");

    await page.click("text=Accept and continue");

    await expect(page.getByText("Thank you!")).toBeVisible();
  });

  test("Rushing through the end redirects to the start", async ({ page }) => {
    await page.goto("/signup/terms");
    await page.click("text=Accept and continue");

    await page.waitForURL("**/signup");
  });

  test("Name / surname failures are handled", async ({ page }) => {
    await page.goto("/signup");

    await page.click("text=Next");
    await expect(page.getByText("Please enter your first name")).toBeVisible();

    await page.fill('input[name="first_name"]', "A");
    await page.click("text=Next");
    await expect(
      page.getByText("The name you entered is too short"),
    ).toBeVisible();

    // As long as we get 3 letters, we're good
    const tooLong = "A".repeat(51);
    await page.fill('input[name="last_name"]', tooLong);
    await page.click("text=Next");
    await expect(
      page.getByText("The name you entered is too long"),
    ).toBeVisible();

    await page.fill('input[name="last_name"]', "Doe 👨🏼‍💻");
    await page.click("text=Next");
    await expect(
      page.getByText("The name contains some invalid characters"),
    ).toBeVisible();
  });

  test("Username failures are handled", async ({ page }) => {
    await page.goto("/signup/username");

    await page.click("text=Next");
    await expect(
      page.getByText("Please enter your new username"),
    ).toBeVisible();

    await page.fill('input[name="username"]', "a!b");
    await page.click("text=Next");
    await expect(
      page.getByText(
        "Your username can contain only letters, numbers and dots (.)",
      ),
    ).toBeVisible();

    await page.fill('input[name="username"]', ".123");
    await page.click("text=Next");
    await expect(
      page.getByText("Your username must start with a letter or number"),
    ).toBeVisible();

    await page.fill('input[name="username"]', "123.");
    await page.click("text=Next");
    await expect(
      page.getByText("Your username must end with a letter or number"),
    ).toBeVisible();

    await page.fill('input[name="username"]', "john..doe");
    await page.click("text=Next");
    await expect(
      page.getByText("Your username cannot contain two dots (.) in a row"),
    ).toBeVisible();

    await page.fill('input[name="username"]', "lazy");
    await page.click("text=Next");
    await expect(
      page.getByText("Your username must be between 6 and 30 characters"),
    ).toBeVisible();

    await page.fill('input[name="username"]', "lazy".repeat(10));
    await page.click("text=Next");
    await expect(
      page.getByText("Your username must be between 6 and 30 characters"),
    ).toBeVisible();

    // Reload, as the following test has the same error message
    await page.reload();

    // Dots are not counted in the length
    await page.fill('input[name="username"]', "l.a.z.y");
    await page.click("text=Next");
    await expect(
      page.getByText("Your username must be between 6 and 30 characters"),
    ).toBeVisible();

    // Test for a username used in the fixtures
    await page.fill('input[name="username"]', "john.doe.1");
    await page.click("text=Next");

    await expect(page.getByText("This username is taken")).toBeVisible();
  });

  test("Password failures are handled", async ({ page }) => {
    await page.goto("/signup/password");

    await page.click("text=Next");
    await expect(page.getByText("Please enter your password")).toBeVisible();

    await page.fill('input[name="password"]', "123");
    await page.click("text=Next");
    await expect(
      page.getByText("Please use 10 or more characters"),
    ).toBeVisible();

    await page.fill('input[name="password"]', "1".repeat(300));
    await page.click("text=Next");
    await expect(
      page.getByText("The password you entered is too long"),
    ).toBeVisible();

    await page.fill('input[name="password"]', "superpassword");
    await page.click("text=Next");
    await expect(
      page.getByText(
        "Please use a stronger password. Use a mix of letters, numbers and symbols",
      ),
    ).toBeVisible();
  });

  test.describe("When the user is running the OS in Spanish", () => {
    test.use({
      locale: "es-ES",
    });

    test("It presents the signup form in Spanish", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.getByText("Apellidos")).toBeVisible();
      await expect(page.getByText("Siguiente")).toBeVisible();
    });
  });
});
