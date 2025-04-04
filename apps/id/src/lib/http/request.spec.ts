import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { HttpRequest } from "./request";

describe("HttpRequest", () => {
  let request: Request;
  let httpRequest: HttpRequest;

  beforeEach(() => {
    const headers = new Map();
    headers.set("Host", "example.com");
    headers.set("Authorization", "Bearer token123");
    headers.set("Content-Type", "application/json");
    headers.set("X-Forwarded-Proto", "https");
    headers.set("User-Agent", "TestAgent");
    headers.set("Cookie", "session=abc123");

    // Mock Request object
    request = {
      method: "GET",
      url: "https://example.com/path?query=value",
      headers: {
        get: (name: string) => headers.get(name) || null,
        forEach: (callback: (value: string, key: string) => void) => {
          headers.forEach((value, key) => callback(value, key));
        },
      },
    } as unknown as Request;

    httpRequest = new HttpRequest(request);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic properties", () => {
    test("method returns request method", () => {
      expect(httpRequest.method).toBe("GET");
    });

    test("isGet returns true for GET requests", () => {
      expect(httpRequest.isGet()).toBe(true);

      const postRequest = new HttpRequest({
        ...request,
        method: "POST",
      } as Request);
      expect(postRequest.isGet()).toBe(false);
    });

    test("isPost returns true for POST requests", () => {
      expect(httpRequest.isPost()).toBe(false);

      const postRequest = new HttpRequest({
        ...request,
        method: "POST",
      } as Request);
      expect(postRequest.isPost()).toBe(true);
    });
  });

  describe("cookies", () => {
    test("cookies returns cookie object from getCookies", () => {
      expect(httpRequest.cookies).toEqual({ session: "abc123" });
    });

    test("cookie returns specific cookie value", () => {
      expect(httpRequest.cookie("session")).toBe("abc123");
      expect(httpRequest.cookie("nonexistent")).toBeUndefined();
    });
  });

  describe("headers", () => {
    test("headers returns all headers in lowercase", () => {
      expect(httpRequest.headers).toEqual({
        host: "example.com",
        authorization: "Bearer token123",
        cookie: "session=abc123",
        "content-type": "application/json",
        "x-forwarded-proto": "https",
        "user-agent": "TestAgent",
      });
    });

    test("header returns specific header value", () => {
      expect(httpRequest.header("Authorization")).toBe("Bearer token123");
      expect(httpRequest.header("nonexistent")).toBeNull();
    });

    test("authorization returns Authorization header", () => {
      expect(httpRequest.authorization).toBe("Bearer token123");
    });

    test("bearerToken extracts token from Authorization header", () => {
      expect(httpRequest.bearerToken).toBe("token123");

      // Test with non-bearer auth
      const basicAuthRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) =>
            name === "Authorization" ? "Basic abc123" : null,
        },
      } as unknown as Request);
      expect(basicAuthRequest.bearerToken).toBeNull();

      // Test with no auth
      const noAuthRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (_: string) => null,
        },
      } as unknown as Request);
      expect(noAuthRequest.bearerToken).toBeNull();
    });
  });

  describe("URL and path properties", () => {
    test("protocol returns X-Forwarded-Proto or default", () => {
      expect(httpRequest.protocol).toBe("https");

      const noProtoRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) =>
            name === "X-Forwarded-Proto" ? null : request.headers.get(name),
        },
      } as unknown as Request);
      expect(noProtoRequest.protocol).toBe("http");
    });

    test("host returns Host header or empty string", () => {
      expect(httpRequest.host).toBe("example.com");

      const noHostRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) =>
            name === "Host" ? null : request.headers.get(name),
        },
      } as unknown as Request);
      expect(noHostRequest.host).toBe("");
    });

    test("baseUrl combines protocol and host", () => {
      expect(httpRequest.baseUrl).toBe("https://example.com");
    });

    test("remoteAddr returns client IP address", () => {
      // Test X-Forwarded-For
      const xffRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "X-Forwarded-For") return "203.0.113.195, 70.41.3.18";
            return request.headers.get(name);
          },
        },
      } as unknown as Request);
      expect(xffRequest.remoteAddr).toBe("203.0.113.195");

      // Test X-Real-Ip
      const xRealIpRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "X-Real-Ip") return "198.51.100.42";
            if (name === "X-Forwarded-For") return null;
            return request.headers.get(name);
          },
        },
      } as unknown as Request);
      expect(xRealIpRequest.remoteAddr).toBe("198.51.100.42");

      // Test default
      const defaultIpRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "X-Real-Ip" || name === "X-Forwarded-For") return null;
            return request.headers.get(name);
          },
        },
      } as unknown as Request);
      expect(defaultIpRequest.remoteAddr).toBe("0.0.0.0");
    });

    test("userAgent returns User-Agent header", () => {
      expect(httpRequest.userAgent).toBe("TestAgent");

      const noUaRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) =>
            name === "User-Agent" ? null : request.headers.get(name),
        },
      } as unknown as Request);
      expect(noUaRequest.userAgent).toBe("");
    });

    test("url parses request URL", () => {
      expect(httpRequest.url.toString()).toBe(
        "https://example.com/path?query=value",
      );
    });

    test("path returns URL pathname", () => {
      expect(httpRequest.path).toBe("/path");
    });

    test("query returns URL search params", () => {
      expect(httpRequest.query.get("query")).toBe("value");
    });

    test("queryParams returns object from URL search params", () => {
      expect(httpRequest.queryParams).toEqual({ query: "value" });
    });

    test("queryParam returns specific query parameter", () => {
      expect(httpRequest.queryParam("query")).toBe("value");
      expect(httpRequest.queryParam("nonexistent")).toBeNull();
    });
  });

  describe("content type detection", () => {
    test("isFormData returns true for form data requests", () => {
      expect(httpRequest.isFormData()).toBe(false);

      const formDataRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "Content-Type")
              return "application/x-www-form-urlencoded; charset=UTF-8";
            return request.headers.get(name);
          },
        },
      } as unknown as Request);
      expect(formDataRequest.isFormData()).toBe(true);
    });

    test("isJson returns true for JSON requests", () => {
      expect(httpRequest.isJson()).toBe(true);

      const nonJsonRequest = new HttpRequest({
        ...request,
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "Content-Type") return "text/plain";
            return request.headers.get(name);
          },
        },
      } as unknown as Request);
      expect(nonJsonRequest.isJson()).toBe(false);
    });
  });

  describe("request body", () => {
    test("formData rejects for non-form requests", async () => {
      await expect(httpRequest.formData).rejects.toThrow(
        "Request is not a form data",
      );

      // Setup valid form request
      const formRequest = new HttpRequest({
        ...request,
        method: "POST",
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "Content-Type")
              return "application/x-www-form-urlencoded; charset=UTF-8";
            return request.headers.get(name);
          },
        },
        formData: vi.fn(() => Promise.resolve(new FormData())),
      } as unknown as Request);

      await expect(formRequest.formData).resolves.toBeInstanceOf(FormData);
    });

    test("json rejects for non-JSON requests", async () => {
      const getJsonRequest = new HttpRequest({
        ...request,
        json: vi.fn(() => Promise.resolve({ data: "test" })),
      } as unknown as Request);
      await expect(getJsonRequest.json).rejects.toThrow(
        "Request is not a JSON",
      );

      // Setup valid JSON POST request
      const postJsonRequest = new HttpRequest({
        ...request,
        method: "POST",
        json: vi.fn(() => Promise.resolve({ data: "test" })),
      } as unknown as Request);

      await expect(postJsonRequest.json).resolves.toEqual({ data: "test" });
    });

    test("formParams converts FormData to object", async () => {
      const mockFormData = new FormData();
      mockFormData.append("name", "test");
      mockFormData.append("value", "123");

      const formRequest = new HttpRequest({
        ...request,
        method: "POST",
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "Content-Type")
              return "application/x-www-form-urlencoded; charset=UTF-8";
            return request.headers.get(name);
          },
        },
        formData: vi.fn(() => Promise.resolve(mockFormData)),
      } as unknown as Request);

      // Need to mock FormData.entries() in a way Jest can understand
      const entriesMock = vi.fn(() =>
        [
          ["name", "test"],
          ["value", "123"],
        ][Symbol.iterator](),
      );

      Object.defineProperty(mockFormData, "entries", {
        value: entriesMock,
      });

      await expect(formRequest.formParams).resolves.toEqual({
        name: "test",
        value: "123",
      });
    });

    test("params combines query and form params for POST form requests", async () => {
      const mockFormData = new FormData();
      mockFormData.append("name", "test");

      const formRequest = new HttpRequest({
        ...request,
        method: "POST",
        url: "https://example.com/path?query=value",
        headers: {
          ...request.headers,
          get: (name: string) => {
            if (name === "Content-Type")
              return "application/x-www-form-urlencoded; charset=UTF-8";
            return request.headers.get(name);
          },
        },
        formData: vi.fn(() => Promise.resolve(mockFormData)),
      } as unknown as Request);

      // Mock FormData.entries()
      const entriesMock = vi.fn(() => [["name", "test"]][Symbol.iterator]());

      Object.defineProperty(mockFormData, "entries", {
        value: entriesMock,
      });

      await expect(formRequest.params).resolves.toEqual({
        query: "value",
        name: "test",
      });
    });

    test("params returns only query params for non-form requests", async () => {
      await expect(httpRequest.params).resolves.toEqual({
        query: "value",
      });
    });
  });

  describe("buildUrl", () => {
    test("builds URL with base URL and path", () => {
      expect(httpRequest.buildUrl("/api/data")).toBe(
        "https://example.com/api/data",
      );
    });

    test("builds URL with query parameters", () => {
      expect(
        httpRequest.buildUrl("/api/data", { sort: "desc", limit: "10" }),
      ).toBe("https://example.com/api/data?sort=desc&limit=10");
    });
  });
});
