import { describe, expect, it } from "vitest";
import { generateSet } from "./gen";

describe("generateSet", () => {
  it("generates a set of keys", async () => {
    const set = await generateSet();
    expect(set.rsa).toBeDefined();
    expect(set.ec).toBeDefined();
    expect(set.ed).toBeDefined();
  });

  it("sets the kid property to the thumbprint of the key", async () => {
    const set = await generateSet();
    expect(set.rsa.kid).toBeDefined();
    expect(set.ec.kid).toBeDefined();
    expect(set.ed.kid).toBeDefined();
  });
});
