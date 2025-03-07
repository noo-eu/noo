import { describe, expect, test } from "bun:test";
import { buildFormPostResponse } from "./formPost";

describe("buildFormPostResponse", () => {
  test("returns an html page", async () => {
    const response = await buildFormPostResponse("https://example.com/data", {
      key: "value",
    });

    expect(response.headers.get("Content-Type")).toBe("text/html");

    const body = await response.text();
    expect(body).toContain('action="https://example.com/data"');
    expect(body).toContain('name="key"');
    expect(body).toContain('value="value"');
  });
});
