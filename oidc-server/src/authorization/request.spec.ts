import { beforeEach, describe, expect, Mock, test, vi } from "vitest";
import { performOidcAuthorization } from "./request";
import configuration, { Client } from "@/configuration";
import { setActiveSessions } from "@/../vitest-setup";
import { createIdToken } from "@/idToken";

const makeRequestData = (data: Record<string, string | undefined>) => {
  return {
    response_type: "code",
    client_id: "oidc_1",
    scope: "openid profile",
    redirect_uri: "https://localhost:22999/cb",
    state: "state",
    nonce: "nonce",
    ...data,
  };
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
      test("returns the consent page", async () => {
        const result = await performOidcAuthorization(makeRequestData({}));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONSENT");
      });
    });

    describe("if the only scope is openid", () => {
      test("it redirects to the confirm page, even if the user has not yet consented to the client", async () => {
        const request = { scope: "openid" };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONFIRM");
      });

      test("supports overriding the response_mode", async () => {
        const request = { scope: "openid", response_mode: "form_post" };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONFIRM");
        expect(result.value.params.response_mode).toBe("form_post");
      });
    });

    describe("when prompt=login is set", () => {
      test("returns the login page", async () => {
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

    test("returns the session selection page", async () => {
      const result = await performOidcAuthorization(makeRequestData({}));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("SELECT_ACCOUNT");
    });

    describe("when an id_token_hint is provided", async () => {
      test("restricts the candidate session to the one matching the id_token_hint", async () => {
        const idToken = await createIdToken(
          (await configuration.getClient("oidc_1"))!,
          "usr_1",
          {},
        );

        const result = await performOidcAuthorization(
          makeRequestData({
            id_token_hint: idToken,
            scope: "openid",
          }),
        );

        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        // In this case, the id_token_hint matches a session that has already
        // consented to the client (openid is implicit), so we go to the confirm
        // page.
        expect(result.value.nextStep).toBe("CONFIRM");
      });

      test("ignores invalid id_token_hint values", async () => {
        const request = { id_token_hint: "invalid" };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("SELECT_ACCOUNT");
      });
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

  describe("prompt=select_account", () => {
    test("redirects to the session selection page", async () => {
      const request = { prompt: "select_account" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error("Expected an error result");
      }

      expect(result.value.nextStep).toBe("SELECT_ACCOUNT");
    });
  });

  describe("prompt=consent", () => {
    test("proceeds as a prompt=login; TODO: this is not really what's asked.", async () => {
      const request = { prompt: "consent" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error("Expected an error result");
      }

      expect(result.value.nextStep).toBe("SIGN_IN");
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

    describe("non-OIDC (OAuth2) requests", () => {
      test("it works", async () => {
        const request = { response_type: "token", scope: "profile" };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONSENT");
      });

      test("it works even if the scopes are empty", async () => {
        const request = { response_type: "token", scope: undefined };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("CONFIRM"); // there's nothing to consent to
      });

      test("max_age is not allowed", async () => {
        const request = {
          response_type: "token",
          scope: "profile",
          max_age: "1",
        };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("REDIRECT");
        expect(result.value.url).toContain("error=invalid_request");
      });

      test("id_token cannot be requested", async () => {
        const request = {
          response_type: "code id_token",
          scope: "profile",
        };
        const result = await performOidcAuthorization(makeRequestData(request));
        if (!result.isOk()) {
          throw new Error(`Expected a successful result, got: ${result.error}`);
        }

        expect(result.value.nextStep).toBe("REDIRECT");
        expect(result.value.url).toContain("error=invalid_request");
      });

      test("prompt=login is not allowed", async () => {
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

    test("accepts a 0 max_age", async () => {
      const request = { max_age: "0" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isOk()) {
        throw new Error(`Expected a successful result, got: ${result.error}`);
      }

      expect(result.value.nextStep).toBe("SIGN_IN");
    });
  });

  describe("when using request_uri", () => {
    test("it fails (not implemented)", async () => {
      const request = { request_uri: "https://example.com" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("request_uri_not_supported");
    });
  });

  describe("when using request", () => {
    test("it fails (not implemented)", async () => {
      const request = { request: "request" };
      const result = await performOidcAuthorization(makeRequestData(request));
      if (!result.isErr()) {
        throw new Error("Expected an error result");
      }

      expect(result.error).toEqual("request_not_supported");
    });
  });
});
