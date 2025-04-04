import { describe, expect, it } from "vitest";
import {
  bufferToUUID,
  decodeSessionToken,
  encodeSessionToken,
} from "~/auth.server/sessions/token";

describe("Session token encoding/decoding", () => {
  it("round-trips encode/decode", () => {
    const token = {
      sid: "00000000-0000-0000-0000-000000000001",
      verifier: "yzS-Cx1NFjQlRFiUem8B6zn3S63-kq_XCBnXcoV5YYE",
    };

    const encoded = encodeSessionToken(token);
    const decoded = decodeSessionToken(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.sid).toBe(token.sid);
    expect(decoded?.verifier).toBe(token.verifier);
  });

  it("returns null on invalid token length", () => {
    const invalid = "abc";
    expect(decodeSessionToken(invalid)).toBeNull();
  });

  it("returns null on invalid decoded buffer size", () => {
    const invalid = Buffer.from("too short").toString("base64url");
    expect(decodeSessionToken(invalid)).toBeNull();

    const invalid2 = "a".repeat(50) + "!".repeat(14);
    expect(decodeSessionToken(invalid2)).toBeNull();
  });

  it("converts UUID buffer to string correctly", () => {
    const uuid = "00000000-0000-0000-0000-000000000001";
    const buf = Buffer.from(uuid.replace(/-/g, ""), "hex");
    expect(bufferToUUID(buf)).toBe(uuid);
  });
});
