import { expect, test } from "@playwright/test";

test.describe("Private provider", () => {
  test.describe("OpenID Registation", () => {
    test("Allows self-registration", async ({ request }) => {
      const requestObject = JSON.stringify({
        client_name: "My Client",
        redirect_uris: ["https://example.com"],
      });

      // The domain must have been registered first
      let response = await request.post("/oidc/microsoft.com/register", {
        data: requestObject,
      });
      expect(response.status()).toBe(404);

      // Failure is expected without a Bearer token
      response = await request.post("/oidc/acme.fr/register", {
        data: requestObject,
      });
      expect(response.status()).toBe(401);

      // Register a new client
      response = await request.post("/oidc/acme.fr/register", {
        data: requestObject,
        // See fixtures.ts for the token
        headers: {
          Authorization: "Bearer yzS-Cx1NFjQlRFiUem8B6zn3S63-kq_XCBnXcoV5YYE",
        },
      });

      expect(response.status()).toBe(201);
      const client = await response.json();
      expect(client).toMatchObject({
        client_id: expect.any(String),
        client_secret: expect.any(String),
        client_name: "My Client",
      });
    });
  });
});
