import { describe, expect, test } from "bun:test";
import { validatePkce } from "./pkce";

describe("validatePkce", async () => {
  test("returns an error if the verifier is missing", async () => {
    expect(validatePkce(undefined, "S256", "0".repeat(43))).toEqual(
      "invalid_request",
    );
  });

  test("returns an error if the method is invalid", async () => {
    expect(validatePkce("verifier", "invalidMethod", "0".repeat(43))).toEqual(
      "invalid_request",
    );
  });

  test("returns an error if the challenge does not match", async () => {
    expect(validatePkce("verifier", "S256", "0".repeat(43))).toEqual(
      "invalid_grant",
    );
  });

  test("returns null if the challenge matches", async () => {
    expect(
      validatePkce(
        "helloworld",
        "S256",
        "k2oYXKqiZrucvpgengXLeM1zKwsygOuURBK7b4-PB68",
      ),
    ).toBeNull();
  });
});
