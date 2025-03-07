import { beforeEach, describe, expect, mock, test } from "bun:test";
import { composeMiddleware, Middleware } from ".";
import { HttpRequest } from "../http/request";

describe("composeMiddleware", () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    // Create a mock HttpRequest object
    mockRequest = {} as HttpRequest;
  });

  test("returns 404 response when no middleware is provided", async () => {
    // Create composed middleware with no middleware functions
    const composed = composeMiddleware();

    // Call the composed middleware
    const response = await composed(mockRequest);

    // Verify response is 404
    expect(response.status).toBe(404);
  });

  test("calls a single middleware correctly", async () => {
    // Create mock middleware that returns a 200 response
    const middleware: Middleware = mock(() => {
      return Promise.resolve(new Response("Success", { status: 200 }));
    });

    // Create composed middleware
    const composed = composeMiddleware(middleware);

    // Call the composed middleware
    const response = await composed(mockRequest);

    // Verify middleware was called
    expect(middleware).toHaveBeenCalledWith(mockRequest, expect.any(Function));

    // Verify response
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Success");
  });

  test("calls multiple middleware in correct order", async () => {
    // Track order of middleware calls
    const callOrder: number[] = [];

    // Create mock middleware functions
    const middleware1: Middleware = mock(async (req, next) => {
      callOrder.push(1);
      return next ? next(req) : new Response(null, { status: 404 });
    });

    const middleware2: Middleware = mock(async (req, next) => {
      callOrder.push(2);
      return next ? next(req) : new Response(null, { status: 404 });
    });

    const middleware3: Middleware = mock(async () => {
      callOrder.push(3);
      return new Response("Final handler", { status: 200 });
    });

    // Create composed middleware
    const composed = composeMiddleware(middleware1, middleware2, middleware3);

    // Call the composed middleware
    const response = await composed(mockRequest);

    // Verify middleware were called in correct order
    expect(callOrder).toEqual([1, 2, 3]);

    // Verify middleware were called with correct arguments
    expect(middleware1).toHaveBeenCalledWith(mockRequest, expect.any(Function));
    expect(middleware2).toHaveBeenCalledWith(mockRequest, expect.any(Function));
    expect(middleware3).toHaveBeenCalledWith(mockRequest, expect.any(Function));

    // Verify response
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Final handler");
  });

  test("middleware can short-circuit the chain", async () => {
    // Create mock middleware functions
    const middleware1: Middleware = mock(async () => {
      return new Response("Short circuit", { status: 403 });
    });

    const middleware2: Middleware = mock(async () => {
      return new Response("Should not reach here", { status: 200 });
    });

    // Create composed middleware
    const composed = composeMiddleware(middleware1, middleware2);

    // Call the composed middleware
    const response = await composed(mockRequest);

    // Verify first middleware was called
    expect(middleware1).toHaveBeenCalledWith(mockRequest, expect.any(Function));

    // Verify second middleware was not called
    expect(middleware2).not.toHaveBeenCalled();

    // Verify response from first middleware
    expect(response.status).toBe(403);
    const text = await response.text();
    expect(text).toBe("Short circuit");
  });

  test("middleware can modify the request before passing to next middleware", async () => {
    // Create a modified request
    const modifiedRequest = { modified: true } as unknown as HttpRequest;

    // Create mock middleware functions
    const middleware1: Middleware = mock(async (_, next) => {
      return next ? next(modifiedRequest) : new Response(null, { status: 404 });
    });

    const middleware2: Middleware = mock(async (req) => {
      return new Response(
        JSON.stringify({ receivedModified: req === modifiedRequest }),
      );
    });

    // Create composed middleware
    const composed = composeMiddleware(middleware1, middleware2);

    // Call the composed middleware
    const response = await composed(mockRequest);

    // Verify middleware were called with correct arguments
    expect(middleware1).toHaveBeenCalledWith(mockRequest, expect.any(Function));
    expect(middleware2).toHaveBeenCalledWith(
      modifiedRequest,
      expect.any(Function),
    );

    // Verify response indicates the request was modified
    const body = await response.json();
    expect(body).toEqual({ receivedModified: true });
  });

  test("middleware chain handles errors correctly", async () => {
    // Create mock middleware functions
    const middleware1: Middleware = mock(async (req, next) => {
      try {
        return next ? await next(req) : new Response(null, { status: 404 });
      } catch (error) {
        return new Response("Caught error: " + (error as Error).message, {
          status: 500,
        });
      }
    });

    const middleware2: Middleware = mock(async () => {
      throw new Error("Test error");
    });

    // Create composed middleware
    const composed = composeMiddleware(middleware1, middleware2);

    // Call the composed middleware
    const response = await composed(mockRequest);

    // Verify middleware were called
    expect(middleware1).toHaveBeenCalledWith(mockRequest, expect.any(Function));
    expect(middleware2).toHaveBeenCalledWith(mockRequest, expect.any(Function));

    // Verify error was caught and handled
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Caught error: Test error");
  });
});
