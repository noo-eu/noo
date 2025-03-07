import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Middleware } from ".";
import { HttpRequest } from "../http/request";
import { cors } from "./cors";

describe("cors middleware", () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    // Create a mock HttpRequest object
    mockRequest = {
      method: "GET",
      headers: {},
    } as HttpRequest;
  });

  test("handles OPTIONS request with 204 status", async () => {
    // Create request with OPTIONS method
    // @ts-ignore
    mockRequest.method = "OPTIONS";

    // Set origin in request headers
    mockRequest.headers["origin"] = "https://example.com";

    // Create middleware with allowed methods
    const middleware = cors(["GET", "POST"]);

    // Call the middleware
    const response = await middleware(mockRequest);

    // Verify response status is 204
    expect(response.status).toBe(204);

    // Verify CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://example.com",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  test("adds CORS headers to response from next middleware for allowed method", async () => {
    // Create mock next middleware
    const mockNext: Middleware = mock(() =>
      Promise.resolve(new Response("Test response")),
    );

    // Set method and origin
    // @ts-ignore
    mockRequest.method = "GET";
    mockRequest.headers["origin"] = "https://example.com";

    // Create middleware with allowed methods
    const middleware = cors(["GET", "POST"]);

    // Call the middleware
    const response = await middleware(mockRequest, mockNext);

    // Verify next middleware was called
    expect(mockNext).toHaveBeenCalledWith(mockRequest);

    // Verify CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://example.com",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  test("uses * as default origin when Origin header is missing", async () => {
    // Create mock request without origin header
    // @ts-ignore
    mockRequest.method = "GET";
    // @ts-ignore
    mockRequest.headers = {};

    // Create middleware with allowed methods
    const middleware = cors(["GET"]);

    // Call the middleware
    const response = await middleware(mockRequest);

    // Verify CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("returns 404 response when no next middleware and method is not OPTIONS", async () => {
    // Create middleware with allowed methods
    const middleware = cors(["GET"]);

    // Call the middleware without next
    const response = await middleware(mockRequest);

    // Verify status is 404
    expect(response.status).toBe(404);

    // Verify response body
    const body = await response.json();
    expect(body).toEqual({ error: "Not Found" });

    // Verify CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("does not add CORS headers for non-allowed methods", async () => {
    // Create request with non-allowed method
    // @ts-ignore
    mockRequest.method = "DELETE";

    // Create mock next middleware
    const mockNext: Middleware = mock(() =>
      Promise.resolve(new Response("Test response")),
    );

    // Create middleware with allowed methods that don't include DELETE
    const middleware = cors(["GET", "POST"]);

    // Call the middleware
    const response = await middleware(mockRequest, mockNext);

    // Verify next middleware was called
    expect(mockNext).toHaveBeenCalledWith(mockRequest);

    // Verify no CORS headers were added
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Headers")).toBeNull();
    expect(response.headers.get("Vary")).toBeNull();
  });

  test("respects existing CORS headers in the response", async () => {
    // Create response with existing CORS headers
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "https://existing-origin.com");
    const mockResponse = new Response("Test response", { headers });

    // Create mock next middleware
    const mockNext: Middleware = mock(() => Promise.resolve(mockResponse));

    // Set method and origin
    // @ts-ignore
    mockRequest.method = "GET";
    mockRequest.headers["origin"] = "https://example.com";

    // Create middleware with allowed methods
    const middleware = cors(["GET"]);

    // Call the middleware
    const response = await middleware(mockRequest, mockNext);

    // Verify next middleware was called
    expect(mockNext).toHaveBeenCalledWith(mockRequest);

    // Verify existing CORS headers are preserved
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://existing-origin.com",
    );

    // Verify new CORS headers were not added
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Headers")).toBeNull();
    expect(response.headers.get("Vary")).toBeNull();
  });

  test("uses * as default origin when Origin header is missing", async () => {
    // Create mock request without origin header
    // @ts-ignore
    mockRequest.method = "GET";
    // @ts-ignore
    mockRequest.headers = {};

    // Create middleware with allowed methods
    const middleware = cors(["GET"]);

    // Call the middleware
    const response = await middleware(mockRequest);

    // Verify CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("returns 404 response when no next middleware and method is not OPTIONS", async () => {
    // Create middleware with allowed methods
    const middleware = cors(["GET"]);

    // Call the middleware without next
    const response = await middleware(mockRequest);

    // Verify status is 404
    expect(response.status).toBe(404);

    // Verify response body
    const body = await response.json();
    expect(body).toEqual({ error: "Not Found" });

    // Verify CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("does not add CORS headers for non-allowed methods", async () => {
    // Create request with non-allowed method
    // @ts-ignore
    mockRequest.method = "DELETE";

    // Create mock next middleware
    const mockNext: Middleware = mock(() =>
      Promise.resolve(new Response("Test response")),
    );

    // Create middleware with allowed methods that don't include DELETE
    const middleware = cors(["GET", "POST"]);

    // Call the middleware
    const response = await middleware(mockRequest, mockNext);

    // Verify next middleware was called
    expect(mockNext).toHaveBeenCalledWith(mockRequest);

    // Verify no CORS headers were added
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Headers")).toBeNull();
    expect(response.headers.get("Vary")).toBeNull();
  });

  test("respects existing CORS headers in the response", async () => {
    // Create response with existing CORS headers
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "https://existing-origin.com");
    const mockResponse = new Response("Test response", { headers });

    // Create mock next middleware
    const mockNext: Middleware = mock(() => Promise.resolve(mockResponse));

    // Set method and origin
    // @ts-ignore
    mockRequest.method = "GET";
    mockRequest.headers["origin"] = "https://example.com";

    // Create middleware with allowed methods
    const middleware = cors(["GET"]);

    // Call the middleware
    const response = await middleware(mockRequest, mockNext);

    // Verify next middleware was called
    expect(mockNext).toHaveBeenCalledWith(mockRequest);

    // Verify existing CORS headers are preserved
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://existing-origin.com",
    );

    // Verify new CORS headers were not added
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Headers")).toBeNull();
    expect(response.headers.get("Vary")).toBeNull();
  });
});
