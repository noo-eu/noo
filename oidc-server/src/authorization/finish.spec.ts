import { beforeEach, describe, expect, it } from "vitest";
import { AuthorizationRequest } from "../types";
import { returnToClient } from "./finish";

const params: Pick<AuthorizationRequest, "response_mode" | "redirect_uri"> =
  {} as AuthorizationRequest;

describe("returnToClient", () => {
  beforeEach(() => {
    params.redirect_uri = "https://client.example.com/callback";
    params.response_mode = "query";
  });

  describe("when response_mode is 'query'", () => {
    beforeEach(() => {
      params.response_mode = "query";
    });

    it("returns a REDIRECT step with parameters appended as query string", async () => {
      const result = await returnToClient(params as AuthorizationRequest, {
        code: "abc",
        state: "123",
      });

      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback?code=abc&state=123",
      });
    });

    it("handles redirect_uri with existing query parameters", async () => {
      params.redirect_uri = "https://client.example.com/callback?foo=bar";
      const result = await returnToClient(params as AuthorizationRequest, {
        code: "abc",
        state: "123",
      });

      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback?foo=bar&code=abc&state=123",
      });
    });

    it("handles an empty data object correctly", async () => {
      const result = await returnToClient(params as AuthorizationRequest, {});

      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback",
      });
    });
  });

  describe("when response_mode is 'fragment'", () => {
    beforeEach(() => {
      params.response_mode = "fragment";
    });

    it("returns a REDIRECT step with parameters appended as URL fragment", async () => {
      const result = await returnToClient(params as AuthorizationRequest, {
        code: "abc",
        state: "123",
      });

      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback#code=abc&state=123",
      });
    });

    it("handles an empty data object correctly", async () => {
      const result = await returnToClient(params as AuthorizationRequest, {});

      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback",
      });
    });
  });

  describe("when response_mode is 'form_post'", () => {
    beforeEach(() => {
      params.response_mode = "form_post";
    });

    it("returns a FORM_POST step with data included in the body payload", async () => {
      const result = await returnToClient(params as AuthorizationRequest, {
        code: "abc",
        state: "123",
      });

      expect(result).toEqual({
        params,
        nextStep: "FORM_POST",
        data: {
          code: "abc",
          state: "123",
        },
      });
    });
  });
});
