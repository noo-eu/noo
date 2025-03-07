import { describe, expect, mock, test } from "bun:test";
import { getIpAddress, getUserAgent } from "./nextUtils";

describe("NextJS Utility Functions", () => {
  function mockHeaders(headers: Record<string, string>) {
    const headersMock = {
      headers: () =>
        Promise.resolve({
          get: mock((name: string) => headers[name.toLowerCase()] ?? null),
        }),
    };

    // Mock the next/headers module
    mock.module("next/headers", () => headersMock);
  }

  describe("getIpAddress", () => {
    test("returns x-real-ip when available", async () => {
      mockHeaders({ "x-real-ip": "192.168.1.1" });
      expect(await getIpAddress()).toBe("192.168.1.1");
    });

    test("returns x-forwarded-for when x-real-ip is not available", async () => {
      mockHeaders({ "x-forwarded-for": "203.0.113.195" });
      expect(await getIpAddress()).toBe("203.0.113.195");
    });

    test("returns first IP when x-forwarded-for contains multiple IPs", async () => {
      mockHeaders({
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      });
      expect(await getIpAddress()).toBe("203.0.113.195");
    });

    test("returns default IP when no headers are available", async () => {
      mockHeaders({});
      expect(await getIpAddress()).toBe("0.0.0.0");
    });
  });

  describe("getUserAgent", () => {
    test("returns user-agent header when available", async () => {
      mockHeaders({ "user-agent": "Mozilla/5.0 Test Browser" });
      expect(await getUserAgent()).toBe("Mozilla/5.0 Test Browser");
    });

    test("returns empty string when user-agent is not available", async () => {
      mockHeaders({});
      expect(await getUserAgent()).toBe("");
    });
  });
});
