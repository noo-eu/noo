import { describe, test, expect } from "bun:test";
import { createVerifier, checkVerifier } from "./utils";

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
