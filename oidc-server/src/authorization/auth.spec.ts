import { beforeEach, describe, expect, Mock, test, vi } from "vitest";
import { performOidcAuthorization } from "./request";
import configuration, { Client } from "@/configuration";
import { ACTIVE_SESSIONS, setActiveSessions } from "../../vitest-setup";

let mockSessions: {
  age: number;
  id: string;
  userId: string;
  user: {
    id: string;
  };
  tenantId?: string;
}[] = vi.hoisted(() => []);

const makeRequestData = (data: Record<string, string>) => {
  return Object.assign({
    response_type: "code",
    client_id: "oidc_1",
    scope: "openid profile",
    redirect_uri: "https://localhost:22999/cb",
    state: "state",
    nonce: "nonce",
    ...data,
  });
};

(configuration.getClient as Mock).mockImplementation(
  async (clientId: string) => {
    if (clientId === "oidc_1") {
      return {
        clientId: "oidc_1",
        redirectUris: ["https://localhost:22999/cb"],
        idTokenSignedResponseAlg: "RS256",
      } as Client;
    }

    return undefined;
  },
);

describe("Authorization endpoint", () => {
  describe("when there is only one signed-in user", () => {
    beforeEach(() => {
      setActiveSessions([
        {
          userId: "usr_1",
          lastAuthenticatedAt: new Date(new Date().getDate() - 10000),
        },
      ]);
    });

    describe("when the user has not yet consented to the client", () => {
      test("should return the consent page", async () => {
        const result = await performOidcAuthorization(makeRequestData({}));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONSENT");
      });
    });

    describe("if the only scope is openid, it redirects to the confirm page, even if the user has not yet consented to the client", () => {
      test("should return the consent page", async () => {
        const request = { scope: "openid" };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONFIRM");
      });
    });

    describe("when prompt=login is set", () => {
      test("should return the login page", async () => {
        const request = { prompt: "login" };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("SIGN_IN");
      });
    });
  });

  describe("when there is more than one active session", () => {
    beforeEach(() => {
      setActiveSessions([
        {
          userId: "usr_1",
          lastAuthenticatedAt: new Date(new Date().getDate() - 10000),
        },
        {
          userId: "usr_2",
          lastAuthenticatedAt: new Date(new Date().getDate() - 15000),
        },
      ]);
    });

    test("it should return the session selection page", async () => {
      const result = await performOidcAuthorization(makeRequestData({}));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("SELECT_ACCOUNT");
    });
  });

  describe("prompt=none", () => {
    test("fails if no consent has been granted", async () => {
      const request = { prompt: "none" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error("Expected an error result");
      }

      expect(result.value.nextStep).toBe("REDIRECT");
      expect(result.value.url).toContain("error=interaction_required");
    });
  });

  describe("validations", () => {
    beforeEach(() => {
      setActiveSessions([
        {
          userId: "usr_1",
          lastAuthenticatedAt: new Date(new Date().getDate() - 10000),
        },
      ]);
    });

    test("allows non-OIDC (OAuth2) requests", async () => {
      const request = { response_type: "token", scope: "profile" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("CONSENT");
    });

    test("OAuth2 requests have some restrictions", async () => {
      const request = {
        response_type: "token",
        scope: "profile",
        prompt: "login",
      };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("REDIRECT");
      expect(result.value.url).toContain("error=invalid_request");
    });

    test("requires client_id", async () => {
      const request = { client_id: "" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toBe("missing_client_id");
    });

    test("client_id must be recognized", async () => {
      const request = { client_id: "bad" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toBe("invalid_client_id");
    });

    test("requires response_type", async () => {
      const request = { response_type: "" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("missing_response_type");
    });

    test("requires response_type to be supported", async () => {
      const request = { response_type: "unsupported" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("unsupported_response_type");
    });

    test("when requesting id_token it must have a nonce", async () => {
      const request = { response_type: "id_token", nonce: "" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("REDIRECT");
      expect(result.value.url).toContain("error=implicit_missing_nonce");
    });

    test("cannot have request and request_uri", async () => {
      const request = { request: "request", request_uri: "uri" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("request_and_request_uri");
    });

    test("redirect_uri must be present", async () => {
      const request = { redirect_uri: "" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("missing_redirect_uri");
    });

    test("redirect_uri must match the client", async () => {
      const request = {
        redirect_uri: "https://localhost:22999/cb2",
      };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("invalid_redirect_uri");
    });

    test("response_mode must be supported", async () => {
      const request = { response_mode: "unsupported" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("bad_response_mode");
    });

    test("verifies that claims are properly formatted", async () => {
      const request = { claims: "invalid" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("REDIRECT");
      expect(result.value.url).toContain("error=invalid_request");
    });

    test("verifies that max_age is a 0+ integer", async () => {
      const request = { max_age: "-1" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("REDIRECT");
      expect(result.value.url).toContain("error=invalid_request");
    });
  });
});
