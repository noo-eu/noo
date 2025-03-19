import { describe, expect, test, vi } from "vitest";
import { buildFormPostResponse } from "./formPost";
import { afterEach, beforeEach } from "node:test";

describe("buildFormPostResponse", () => {
  beforeEach(() => {
    vi.mock("next/headers", () => ({
      cookies: vi.fn(() => ({
        get: vi.fn(),
      })),
      headers: vi.fn(() => ({
        get: vi.fn(),
      })),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
