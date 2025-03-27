import { AuthorizationRequest, ResponseMode } from "@/types";
import { returnToClient } from "./finish";
import { describe, test, expect } from "vitest";

describe("returnToClient", () => {
  describe("when using the query response mode", () => {
    test("returns a URL with the correct query parameters", async () => {
      const params = {
        response_mode: "query",
        redirect_uri: "https://client.example.com/callback",
        state: "123",
      };
      const data = {
        code: "abc",
        state: "123",
      };

      const result = await returnToClient(params as AuthorizationRequest, data);
      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback?code=abc&state=123",
      });
    });
  });

  describe("when using the fragment response mode", () => {
    test("returns a URL with the correct fragment parameters", async () => {
      const params = {
        response_mode: "fragment",
        redirect_uri: "https://client.example.com/callback",
        state: "123",
      };
      const data = {
        code: "abc",
        state: "123",
      };

      const result = await returnToClient(params as AuthorizationRequest, data);
      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback#code=abc&state=123",
      });
    });

    test("it works with an empty object", async () => {
      const params = {
        response_mode: "fragment",
        redirect_uri: "https://client.example.com/callback",
      };
      const data = {};

      const result = await returnToClient(params as AuthorizationRequest, data);
      expect(result).toEqual({
        params,
        nextStep: "REDIRECT",
        url: "https://client.example.com/callback",
      });
    });
  });

  describe("when using the form_post response mode", () => {
    test("returns a form with the correct parameters", async () => {
      const params = {
        response_mode: "form_post",
        redirect_uri: "https://client.example.com/callback",
        state: "123",
      };
      const data = {
        code: "abc",
        state: "123",
      };

      const result = await returnToClient(params as AuthorizationRequest, data);
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
