// @vitest-environment happy-dom

import { describe, expect, vi, test } from "vitest";
import { getIpAddress, getUserAgent } from "./nextUtils";
import { afterEach } from "node:test";

let mockedHeaders: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: vi.fn((name: string) => mockedHeaders[name.toLowerCase()] ?? null),
    }),
}));

describe("NextJS Utility Functions", () => {
  function mockHeaders(headers: Record<string, string>) {
    mockedHeaders = headers;
  }

  describe("getIpAddress", () => {
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
