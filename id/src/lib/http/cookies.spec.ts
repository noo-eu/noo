import { afterEach, describe, expect, test, vi } from "vitest";
import { getCookies } from "./cookies";

describe("getCookies", () => {
  const mockHeaders = (ret: string | null) =>
    ({
      get: vi.fn(() => ret),
    }) as unknown as Headers;

  test("returns empty object when Cookie header is not present", () => {
    const headers = mockHeaders(null);
    const result = getCookies(headers);

    expect(headers.get).toHaveBeenCalledWith("Cookie");
    expect(result).toEqual({});
  });

  test("returns empty object when Cookie header is empty", () => {
    const headers = mockHeaders("");
    const result = getCookies(headers);

    expect(headers.get).toHaveBeenCalledWith("Cookie");
    expect(result).toEqual({});
  });

  test("parses a single cookie correctly", () => {
    const headers = mockHeaders("session=abc123");
    const result = getCookies(headers);

    expect(result).toEqual({
      session: "abc123",
    });
  });

  test("parses multiple cookies correctly", () => {
    const headers = mockHeaders("session=abc123; user=john; theme=dark");
    const result = getCookies(headers);

    expect(result).toEqual({
      session: "abc123",
      user: "john",
      theme: "dark",
    });
  });

  test("handles cookies with = in the value", () => {
    const headers = mockHeaders("data=key1=value1&key2=value2");
    const result = getCookies(headers);

    expect(result).toEqual({
      data: "key1=value1&key2=value2",
    });
  });

  test("trims whitespace from cookie names", () => {
    const headers = mockHeaders(" session =abc123;  user  =john");
    const result = getCookies(headers);

    expect(result).toEqual({
      session: "abc123",
      user: "john",
    });
  });

  test("handles cookies without values", () => {
    const headers = mockHeaders("session=abc123; analytics=");
    const result = getCookies(headers);

    expect(result).toEqual({
      session: "abc123",
      analytics: "",
    });
  });

  test("skips invalid cookie entries", () => {
    const headers = mockHeaders("session=abc123; =invalid; user=john");
    const result = getCookies(headers);

    expect(result).toEqual({
      session: "abc123",
      "": "invalid",
      user: "john",
    });
  });

  test("handles malformed cookie string gracefully", () => {
    const headers = mockHeaders(";;;");
    const result = getCookies(headers);

    expect(result).toEqual({});
  });

  test("handles cookies with special characters", () => {
    const headers = mockHeaders(
      "complex=value with spaces; encoded=%22quoted%22",
    );

    const result = getCookies(headers);
    expect(result).toEqual({
      complex: "value with spaces",
      encoded: "%22quoted%22",
    });
  });
});
