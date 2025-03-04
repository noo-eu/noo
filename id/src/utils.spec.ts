import { describe, expect, test } from "bun:test";
import { checkVerifier, createVerifier } from "./utils";

describe("createVerifier", () => {
  test("creates a verifier and digest", () => {
    const { verifier, digest } = createVerifier();
    expect(verifier).toBeDefined();
    expect(digest).toBeDefined();
  });
});

describe("checkVerifier", () => {
  test("returns true for a valid verifier", () => {
    const { verifier, digest } = createVerifier();
    expect(checkVerifier(verifier, digest)).toBe(true);
    expect(checkVerifier(verifier, "invalid")).toBe(false);
  });
});
