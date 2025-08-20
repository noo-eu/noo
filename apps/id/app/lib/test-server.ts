import express from "express";
import type { Express } from "express";
import compression from "compression";

// Import route handlers directly
import {
  loader as authorizeLoader,
  action as authorizeAction,
} from "../routes/oidc/authorize";
import { loader as tokenLoader } from "../routes/oidc/token";
import {
  loader as userinfoLoader,
  action as userinfoAction,
} from "../routes/oidc/userinfo";
import {
  loader as signinLoader,
  action as signinAction,
} from "../routes/signin";
import {
  loader as consentLoader,
  action as consentAction,
} from "../routes/oidc/consent";

// Import React Router contexts needed for proper mocking
import { localeContext } from "../root";
import { createTranslator } from "use-intl";

let testApp: Express | null = null;

/**
 * Creates a test Express server with actual route handlers for HTTP integration testing
 */
export async function createTestServer(): Promise<Express> {
  if (testApp) {
    return testApp;
  }

  const app = express();

  // Middleware setup similar to the main server
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.disable("x-powered-by");

  // Helper to convert Express req to Web API Request
  const createWebRequest = (req: express.Request): Request => {
    const url = new URL(
      req.url,
      `http://${req.get("host") || "localhost:3000"}`,
    );

    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else if (value) {
        headers.set(key, value);
      }
    });

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    // Add body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.is("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        Object.entries(req.body || {}).forEach(([key, value]) => {
          params.set(key, String(value));
        });
        init.body = params.toString();
        headers.set("content-type", "application/x-www-form-urlencoded");
      } else {
        init.body = JSON.stringify(req.body || {});
        headers.set("content-type", "application/json");
      }
    }

    return new Request(url.toString(), init);
  };

  // Helper to handle React Router responses
  const handleRouteResponse = async (
    res: express.Response,
    routeResponse: any,
  ) => {
    if (routeResponse instanceof Response) {
      // Handle Web API Response objects
      const status = routeResponse.status;
      res.status(status);

      // Copy headers
      routeResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Handle redirects
      if (status >= 300 && status < 400) {
        const location = routeResponse.headers.get("location");
        if (location) {
          return res.redirect(status, location);
        }
      }

      // Handle response body
      const contentType = routeResponse.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await routeResponse.json();
        return res.json(json);
      } else {
        const text = await routeResponse.text();
        return res.send(text);
      }
    } else {
      // Handle plain objects/data
      res.json(routeResponse);
    }
  };

  // Mock React Router context with proper data
  const createMockContext = () => {
    // Create a mock makeT function
    const mockMakeT = (namespace: string) => {
      return createTranslator({
        namespace,
        locale: "en",
        messages: {}, // Empty messages for tests
      });
    };

    return {
      get: (key: any) => {
        if (key === localeContext) {
          return {
            locale: "en",
            rawLocale: "en",
            makeT: mockMakeT,
          };
        }
        return undefined;
      },
      set: (key: any, value: any) => {},
    };
  };

  // Sign-in routes
  app.get("/signin", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await signinLoader({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Signin loader error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/signin", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await signinAction({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Signin action error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OIDC Authorization endpoint
  app.get("/oidc/authorize", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await authorizeLoader({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Authorize error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OIDC Token endpoint
  app.post("/oidc/token", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await tokenLoader({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Token error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OIDC Userinfo endpoint
  app.get("/oidc/userinfo", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await userinfoLoader({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Userinfo error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/oidc/userinfo", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await userinfoAction({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Userinfo error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OIDC Consent endpoint
  app.get("/oidc/consent", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await consentLoader({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Consent error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/oidc/consent", async (req, res) => {
    try {
      const webRequest = createWebRequest(req);
      const result = await consentAction({
        request: webRequest,
        params: {},
        context: createMockContext(),
      });
      await handleRouteResponse(res, result);
    } catch (error) {
      console.error("Consent action error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  testApp = app;
  return app;
}

/**
 * Resets the test server instance
 */
export function resetTestServer(): void {
  testApp = null;
}
