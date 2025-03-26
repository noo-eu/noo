import { describe, expect, it } from "vitest";
import { generateSet } from "./gen";

describe("generateSet", () => {
  it("generates a set of keys", async () => {
    const set = await generateSet();

    expect(set.keys).toBeDefined();
    expect(set.keys.length).toBe(3);

    const expectedKeys = ["OKP", "RSA", "EC"];
    const foundKeys = set.keys.map((key) => key.kty);

    expect(foundKeys).toEqual(expect.arrayContaining(expectedKeys));
  });

  it("sets the kid property to the thumbprint of the key", async () => {
    const set = await generateSet();
    expect(set.keys[0].kid).toBeDefined();
    expect(set.keys[1].kid).toBeDefined();
    expect(set.keys[2].kid).toBeDefined();
  });
});
