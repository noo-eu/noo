import { describe, expect, it, vi } from "vitest";
import type { Client } from "./configuration"; // Import ConsentData type if defined, otherwise use inline object
import configuration from "./configuration";
import { verifyConsent } from "./consent"; // Adjust path if needed
import type { Claims } from "./types";

const testUserId = "user-123";
const createMockClient = (overrides: Partial<Client> = {}): Client =>
  ({
    clientId: "test-client-consent",
    ...overrides,
  }) as Client;

let testClient: Client = createMockClient();

describe("verifyConsent", () => {
  it("returns true when all requested scopes (excl. openid if strict=false) and claims are consented", async () => {
    const mockConsent = {
      scopes: ["profile", "email"],
      claims: ["email", "name"],
    };

    const getConsentSpy = vi.spyOn(configuration, "getConsent");
    getConsentSpy.mockResolvedValue(mockConsent);

    const requestedScopes = ["openid", "email", "profile"];
    const requestedClaims: Claims = {
      userinfo: { email: null },
      id_token: { name: null },
    };

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(true); // Should be true because openid is ignored by default
  });

  it("returns false when a required scope (other than openid if strict=false) is missing", async () => {
    const mockConsent = {
      scopes: ["email"], // 'profile' scope missing from consent
      claims: ["email", "name"],
    };

    const getConsentSpy = vi
      .spyOn(configuration, "getConsent")
      .mockResolvedValue(mockConsent);

    const requestedScopes = ["openid", "email", "profile"]; // Requesting profile
    const requestedClaims: Claims = {
      userinfo: { email: null },
      id_token: { name: null },
    };

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(false);
  });

  it("returns false when strict=true and 'openid' scope is missing from consent", async () => {
    const mockConsent = {
      scopes: ["email", "profile"], // 'openid' missing from consent
      claims: ["email"],
    };
    const getConsentSpy = vi
      .spyOn(configuration, "getConsent")
      .mockResolvedValue(mockConsent);

    const requestedScopes = ["openid", "email"]; // Requesting openid
    const requestedClaims: Claims = {
      userinfo: { email: null },
    };
    const strictMode = true;

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
      strictMode,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(false); // False because strict=true requires openid in consent
  });

  it("returns true when strict=true and 'openid' scope is present in consent", async () => {
    const mockConsent = {
      scopes: ["openid", "email"], // 'openid' IS present
      claims: ["email"],
    };
    const getConsentSpy = vi
      .spyOn(configuration, "getConsent")
      .mockResolvedValue(mockConsent);

    const requestedScopes = ["openid", "email"];
    const requestedClaims: Claims = { userinfo: { email: null } };
    const strictMode = true;

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
      strictMode,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(true); // True because openid is present and required
  });

  it("returns false when a required claim is missing from consent", async () => {
    const mockConsent = {
      scopes: ["openid", "email", "profile"],
      claims: ["email"], // 'name' claim missing from consent
    };
    const getConsentSpy = vi
      .spyOn(configuration, "getConsent")
      .mockResolvedValue(mockConsent);

    const requestedScopes = ["openid", "profile"];
    const requestedClaims: Claims = {
      id_token: { name: null }, // Requesting 'name' claim
    };

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(false);
  });

  it("returns true when required scopes are present and no specific claims are requested", async () => {
    const mockConsent = {
      scopes: ["openid", "profile"], // Has necessary scopes
      claims: ["email"], // Has some claims, but none requested below
    };
    const getConsentSpy = vi
      .spyOn(configuration, "getConsent")
      .mockResolvedValue(mockConsent);

    const requestedScopes = ["openid", "profile"];
    const requestedClaims: Claims = {}; // No claims requested

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(true);
  });

  it("returns true when no scopes (except openid if strict=false) and no claims are requested", async () => {
    const mockConsent = {
      scopes: ["openid"], // Only consented to openid
      claims: [],
    };
    const getConsentSpy = vi
      .spyOn(configuration, "getConsent")
      .mockResolvedValue(mockConsent);

    const requestedScopes = ["openid"]; // Only requesting openid
    const requestedClaims: Claims = {}; // No claims requested

    const result = await verifyConsent(
      testClient,
      testUserId,
      requestedScopes,
      requestedClaims,
    );

    expect(getConsentSpy).toHaveBeenCalledWith(testClient, testUserId);
    expect(result).toBe(true); // True because only ignored scope requested, no claims
  });
});
