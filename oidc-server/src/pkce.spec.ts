import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { validatePkce } from "./pkce";

describe("validatePkce", () => {
  it("returns an error if the verifier is missing", () => {
    expect(validatePkce(undefined, "S256", "0".repeat(43))).toEqual(
      err("invalid_request"),
    );
  });

  it("returns an error if the method is invalid", () => {
    expect(validatePkce("verifier", "invalidMethod", "0".repeat(43))).toEqual(
      err("invalid_request"),
    );
  });

  describe("when using the S256 method", () => {
    it("returns an error if the challenge does not match", () => {
      expect(validatePkce("verifier", "S256", "0".repeat(43))).toEqual(
        err("invalid_grant"),
      );
    });

    it("returns null if the challenge matches", () => {
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
    it("it fails, as plain is not supported", () => {
      expect(validatePkce("helloworld", "plain", "helloworld")).toEqual(
        err("invalid_request"),
      );
    });
  });
});
