import { beforeEach, describe, expect, vi, test } from "vitest";
import { Middleware } from ".";
import { HttpRequest } from "../http/request";
import { preventCache } from "./preventCache";

describe("preventCache middleware", () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    // Create a mock HttpRequest instance
    mockRequest = {} as HttpRequest;
  });

  test("adds no-store Cache-Control header to response from next middleware", async () => {
    // Create mock response headers
    const headers = new Headers();

    // Create mock response
    const mockResponse = new Response("Test response", {
      status: 200,
      headers,
    });

    // Create mock next middleware function
    const mockNext: Middleware = vi.fn(() => Promise.resolve(mockResponse));

    // Call the middleware
    const result = await preventCache(mockRequest, mockNext);

    // Verify next middleware was called with the request
    expect(mockNext).toHaveBeenCalledWith(mockRequest);

    // Verify result is the response from next middleware
    expect(result).toBe(mockResponse);

    // Verify Cache-Control header was added
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  test("adds no-store Cache-Control header to default 404 response when no next middleware", async () => {
    // Call the middleware without a next function
    const result = await preventCache(mockRequest);

    // Verify status is 404
    expect(result.status).toBe(404);

    // Verify response body contains error message
    const body = await result.json();
    expect(body).toEqual({ error: "Not Found" });

    // Verify Cache-Control header was added
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  test("preserves existing headers in the response", async () => {
    // Create mock response headers with existing values
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("X-Custom-Header", "test-value");

    // Create mock response
    const mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });

    // Create mock next middleware function
    const mockNext: Middleware = vi.fn(() => Promise.resolve(mockResponse));

    // Call the middleware
    const result = await preventCache(mockRequest, mockNext);

    // Verify existing headers are preserved
    expect(result.headers.get("Content-Type")).toBe("application/json");
    expect(result.headers.get("X-Custom-Header")).toBe("test-value");

    // Verify Cache-Control header was added
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  test("overrides existing Cache-Control header", async () => {
    // Create mock response headers with existing Cache-Control
    const headers = new Headers();
    headers.set("Cache-Control", "public, max-age=3600");

    // Create mock response
    const mockResponse = new Response("Cacheable content", {
      status: 200,
      headers,
    });

    // Create mock next middleware function
    const mockNext: Middleware = vi.fn(() => Promise.resolve(mockResponse));

    // Call the middleware
    const result = await preventCache(mockRequest, mockNext);

    // Verify Cache-Control header was overridden
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });
});
