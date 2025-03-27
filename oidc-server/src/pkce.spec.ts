import { describe, expect, test } from "vitest";
import { validatePkce } from "./pkce";
import { err, ok } from "neverthrow";

describe("validatePkce", () => {
  test("returns an error if the verifier is missing", () => {
    expect(validatePkce(undefined, "S256", "0".repeat(43))).toEqual(
      err("invalid_request"),
    );
  });

  test("returns an error if the method is invalid", () => {
    expect(validatePkce("verifier", "invalidMethod", "0".repeat(43))).toEqual(
      err("invalid_request"),
    );
  });

  describe("when using the S256 method", () => {
    test("returns an error if the challenge does not match", () => {
      expect(validatePkce("verifier", "S256", "0".repeat(43))).toEqual(
        err("invalid_grant"),
      );
    });

    test("returns null if the challenge matches", () => {
      expect(
        validatePkce(
          "helloworld",
          "S256",
          "k2oYXKqiZrucvpgengXLeM1zKwsygOuURBK7b4-PB68",
        ),
      ).toEqual(ok(null));
    });
  });

  describe("when using the plain method", () => {
    test("it fails, as plain is not supported", () => {
      expect(validatePkce("helloworld", "plain", "helloworld")).toEqual(
        err("invalid_request"),
      );
    });
  });
});
