import { beforeEach, describe, expect, vi, test } from "vitest";
import { HttpRequest } from "../http/request";
import { oidcAuthorization } from "./authorization";
import { afterEach } from "node:test";

let mockSessions: {
  age: number;
  id: string;
  userId: string;
  tenantId?: string;
}[] = [];

function createMockSessionService() {
  return class MockSessionService {
    activeSessions(maxAge?: number) {
      return mockSessions.filter((session) => {
        return maxAge === undefined || session.age < maxAge;
      });
    }
  };
}

const makeRequestData = (data: Record<string, string>) => {
  return new URLSearchParams({
    response_type: "code",
    client_id: "oidc_1",
    scope: "openid profile",
    redirect_uri: "https://localhost:22999/cb",
    state: "state",
    nonce: "nonce",
    ...data,
  });
};

const makeRequest = (data: Record<string, string> = {}) => {
  const headers = new Headers();
  headers.set("Host", "localhost:22999");
  headers.set("X-Forwarded-Proto", "https");

  return new HttpRequest({
    method: "GET",
    url: `https://localhost:22999/authorize?${makeRequestData(data)}`,
    headers,
  } as unknown as Request);
};

beforeEach(() => {
  mockSessions = [
    {
      id: "session1",
      userId: "00000000-0000-0000-0000-000000000001",
      age: 10,
    },
  ];
});

vi.mock("@/lib/SessionsService", () => ({
  SessionsService: createMockSessionService(),
  getSessionCookie: () => Promise.resolve("session"),
}));

describe("Authorization endpoint", () => {
  describe("when there is only one signed-in user", () => {
    describe("when the user has not yet consented to the client", () => {
      test("should return the consent page", async () => {
        const request = makeRequest();
        const result = await oidcAuthorization(request);

        expect(result.status).toBe(303);
        expect(result.headers.get("Location")).toContain("/oidc/consent");
      });
    });

    describe("if the only scope is openid, it redirects to the continue page, even if the user has not yet consented to the client", () => {
      test("should return the consent page", async () => {
        const request = makeRequest({ scope: "openid" });
        const result = await oidcAuthorization(request);

        expect(result.status).toBe(303);
        expect(result.headers.get("Location")).toContain("/oidc/continue");
      });
    });

    describe("when prompt=login is set", () => {
      test("should return the login page", async () => {
        const request = makeRequest({ prompt: "login" });
        const result = await oidcAuthorization(request);

        expect(result.status).toBe(303);
        expect(result.headers.get("Location")).toContain("/signin");
      });
    });
  });

  describe("when there is more than one active session", () => {
    beforeEach(() => {
      mockSessions = [
        {
          id: "session1",
          userId: "00000000-0000-0000-0000-000000000001",
          age: 10,
        },
        {
          id: "session2",
          userId: "00000000-0000-0000-0000-000000000002",
          age: 15,
        },
      ];
    });

    test("it should return the session selection page", async () => {
      const request = makeRequest();
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain("/switch");
    });
  });

  describe("prompt=none", () => {
    test("fails if no consent has been granted", async () => {
      const request = makeRequest({ prompt: "none" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "error=interaction_required",
      );
    });
  });

  describe("validations", () => {
    test("allows non-OIDC (OAuth2) requests", async () => {
      const request = makeRequest({ response_type: "token", scope: "profile" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain("/oidc/consent");
    });

    test("OAuth2 requests have some restrictions", async () => {
      const request = makeRequest({
        response_type: "token",
        scope: "profile",
        prompt: "login",
      });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain("error=invalid_request");
    });

    test("requires client_id", async () => {
      const request = makeRequest({ client_id: "" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=missing_client_id",
      );
    });

    test("client_id must be recognized", async () => {
      const request = makeRequest({ client_id: "bad" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=invalid_client_id",
      );
    });

    test("client_id must be recognized and found", async () => {
      const request = makeRequest({ client_id: "oidc_bad" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=invalid_client_id",
      );
    });

    test("requires response_type", async () => {
      const request = makeRequest({ response_type: "" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=missing_response_type",
      );
    });

    test("requires response_type to be supported", async () => {
      const request = makeRequest({ response_type: "unsupported" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=unsupported_response_type",
      );
    });

    test("when requesting id_token it must have a nonce", async () => {
      const request = makeRequest({ response_type: "id_token", nonce: "" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=implicit_missing_nonce",
      );
    });

    test("cannot have request and request_uri", async () => {
      const request = makeRequest({ request: "request", request_uri: "uri" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=request_and_request_uri",
      );
    });

    test("redirect_uri must be present", async () => {
      const request = makeRequest({ redirect_uri: "" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=missing_redirect_uri",
      );
    });

    test("redirect_uri must match the client", async () => {
      const request = makeRequest({
        redirect_uri: "https://localhost:22999/cb2",
      });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=invalid_redirect_uri",
      );
    });

    test("response_mode must be supported", async () => {
      const request = makeRequest({ response_mode: "unsupported" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain(
        "/fatal?error=bad_response_mode",
      );
    });

    test("verifies that claims are properly formatted", async () => {
      const request = makeRequest({ claims: "invalid" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain("error=invalid_request");
    });

    test("verifies that max_age is a 0+ integer", async () => {
      const request = makeRequest({ max_age: "-1" });
      const result = await oidcAuthorization(request);

      expect(result.status).toBe(303);
      expect(result.headers.get("Location")).toContain("error=invalid_request");
    });
  });
});
