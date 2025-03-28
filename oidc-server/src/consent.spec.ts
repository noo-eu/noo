import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { verifyConsent } from "./consent";
import configuration, { Client } from "./configuration";
import type { Claims } from "./types";

const mockClient = {} as Client;
const userId = "user-123";

describe("verifyConsent", () => {
  it("returns true when all requested scopes (except openid) and claims are consented to", async () => {
    const mockConsent = {
      scopes: ["profile", "email"],
      claims: ["email", "name"],
    };

    (configuration.getConsent as Mock).mockResolvedValue(mockConsent);

    const scopes = ["openid", "email", "profile"];
    const claims: Claims = {
      userinfo: { email: null },
      id_token: { name: null },
    };

    const result = await verifyConsent(mockClient, userId, scopes, claims);
    expect(result).toBe(true);
  });

  it("returns false when a required scope is missing (strict=false)", async () => {
    const mockConsent = {
      scopes: ["email"],
      claims: ["email", "name"],
    };

    (configuration.getConsent as Mock).mockResolvedValue(mockConsent);

    const scopes = ["openid", "email", "profile"]; // profile is missing
    const claims: Claims = {
      userinfo: { email: null },
      id_token: { name: null },
    };

    const result = await verifyConsent(mockClient, userId, scopes, claims);
    expect(result).toBe(false);
  });

  it("returns false when openid is missing and strict=true", async () => {
    const mockConsent = {
      scopes: ["email", "profile"],
      claims: ["email"],
    };

    (configuration.getConsent as Mock).mockResolvedValue(mockConsent);

    const scopes = ["openid", "email"];
    const claims: Claims = {
      userinfo: { email: null },
      id_token: {},
    };

    const result = await verifyConsent(
      mockClient,
      userId,
      scopes,
      claims,
      true,
    );
    expect(result).toBe(false);
  });

  it("returns false when a required claim is missing", async () => {
    const mockConsent = {
      scopes: ["email", "profile"],
      claims: ["email"], // 'name' is missing
    };

    (configuration.getConsent as Mock).mockResolvedValue(mockConsent);

    const scopes = ["email", "profile"];
    const claims: Claims = {
      userinfo: {},
      id_token: { name: null },
    };

    const result = await verifyConsent(mockClient, userId, scopes, claims);
    expect(result).toBe(false);
  });

  it("returns true when scopes are present and no claims are requested", async () => {
    const mockConsent = {
      scopes: ["openid", "profile"],
      claims: [],
    };

    (configuration.getConsent as Mock).mockResolvedValue(mockConsent);

    const scopes = ["openid", "profile"];
    const claims: Claims = {
      userinfo: {},
      id_token: {},
    };

    const result = await verifyConsent(mockClient, userId, scopes, claims);
    expect(result).toBe(true);
  });
});
