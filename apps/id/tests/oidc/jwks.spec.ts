import { expect, test } from "@playwright/test";

test.describe("JWKs Endpoint", () => {
  test("it responds with a valid JWK Set", async ({ request }) => {
    const response = await request.get("/oidc/jwks.json");

    // A successful response MUST use the 200 OK HTTP status code
    expect(response.status()).toBe(200);

    // and return a JSON object using the application/json content type
    expect(response.headers()["content-type"]).toMatch(/^application\/json\b/);

    const set = await response.json();

    // Check for REQUIRED fields
    expect(set).toMatchObject({
      keys: expect.arrayContaining([
        expect.objectContaining({
          kty: expect.any(String),
          kid: expect.any(String),
        }),
      ]),
    });
  });
});
