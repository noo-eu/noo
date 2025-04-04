import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET", () => {
  it("returns a response with status 200", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns sets cache control header", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toMatch(
      /^public, max-age=\d+$/,
    );
  });

  it("returns a JSON response with JWK set body", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty("keys");

    const keys = body.keys;
    expect(keys).toBeInstanceOf(Array);
    expect(keys.length).toBeGreaterThan(0);
  });
});
