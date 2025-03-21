import { OidcClient } from "@/db/oidc_clients";
import { describe, expect, test, vi } from "vitest";
import { JohnDoe } from "../../../../tests/fixtures/users";
import { AuthorizationRequest } from "../types";
import { buildAuthorizationResponse } from "./response";

vi.mock("@/db/oidc_authorization_codes", () => ({
  default: {
    create: () => Promise.resolve({ id: "test_code_123" }),
  },
}));

vi.mock("@/db/oidc_access_tokens", () => ({
  default: {
    create: vi.fn(() =>
      Promise.resolve({
        id: "test-uuid-access-token",
        expiresAt: new Date(),
      }),
    ),
  },
}));

vi.mock("@/utils", () => ({
  humanIdToUuid: vi.fn((id) =>
    id === "test-client-id" ? "00000000-0000-0000-0000-000000000000" : id,
  ),
  uuidToHumanId: vi.fn((id, prefix) => {
    if (id === "test-uuid-access-token" && prefix === "oidc_at")
      return "test-access-token";
    if (id === "test-client-uuid" && prefix === "oidc") return "test-client-id";
    return "mock-human-id";
  }),
  randomSalt: vi.fn(() => "random-salt"),
  sha256: vi.fn(() => ({ digest: () => "hashed-session-state" })),
}));

vi.mock("../idToken", () => ({
  createIdToken: vi.fn(() => Promise.resolve("test-id-token")),
  idTokenHash: vi.fn((client, token) =>
    token === "test_code_123" ? "test-c-hash" : "test-at-hash",
  ),
}));

vi.mock("../userClaims", () => ({
  requestedUserClaims: vi.fn(() => ({ email: "test@example.com" })),
}));

vi.mock("@/auth/sessions", () => ({
  getAuthenticatedSession: vi.fn(() =>
    Promise.resolve({
      userId: "00000000-0000-0000-0000-000000000000",
      lastAuthenticatedAt: new Date(),
      user: JohnDoe,
    }),
  ),
}));

vi.mock("@/auth/sessions/store", () => ({
  getSessionCheckCookie: vi.fn(() => "test-session-check-cookie"),
}));

describe("buildAuthorizationResponse", () => {
  const mockClient = {
    id: "test-client-uuid",
    clientSecret: "test-secret",
    redirectUris: ["https://example.com/callback"],
  } as unknown as OidcClient;

  test("throws error for unsupported response type", async () => {
    const params = {
      response_type: "unsupported_type",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      scopes: ["openid"],
      claims: { id_token: {} },
      nonce: "test-nonce",
    } as unknown as AuthorizationRequest;

    await expect(
      buildAuthorizationResponse(mockClient, params, JohnDoe),
    ).rejects.toThrow("Unsupported or invalid response type");
  });

  test("handles 'code' response type", async () => {
    const params = {
      response_type: "code",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      scopes: ["openid"],
      claims: { id_token: {} },
      nonce: "test-nonce",
      code_challenge: "test-challenge",
      code_challenge_method: "S256",
    } as unknown as AuthorizationRequest;

    const response = await buildAuthorizationResponse(
      mockClient,
      params,
      JohnDoe,
    );

    expect(response.code).toBe("test_code_123");
    expect(response.session_state).toBeDefined();
  });

  test("handles 'token' response type", async () => {
    const params = {
      response_type: "token",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      scopes: ["openid"],
      claims: { id_token: {} },
      nonce: "test-nonce",
    } as unknown as AuthorizationRequest;

    const response = await buildAuthorizationResponse(
      mockClient,
      params,
      JohnDoe,
    );

    expect(response.access_token).toBe("test-access-token");
    expect(response.token_type).toBe("Bearer");
    expect(response.expires_in).toBe("3600");
    expect(response.session_state).toBeDefined();
  });

  test("handles 'id_token' response type", async () => {
    const params = {
      response_type: "id_token",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      scopes: ["openid"],
      claims: { id_token: {} },
      nonce: "test-nonce",
      issuer: "https://auth.example.com",
    } as unknown as AuthorizationRequest;

    const response = await buildAuthorizationResponse(
      mockClient,
      params,
      JohnDoe,
    );

    expect(response.id_token).toBe("test-id-token");
    expect(response.session_state).toBeDefined();
  });

  test("handles multiple response types (code id_token token)", async () => {
    const params = {
      response_type: "code id_token token",
      client_id: "test-client-id",
      redirect_uri: "https://example.com/callback",
      scopes: ["openid"],
      claims: { id_token: {} },
      nonce: "test-nonce",
      issuer: "https://auth.example.com",
      code_challenge: "test-challenge",
      code_challenge_method: "S256",
    } as unknown as AuthorizationRequest;

    const response = await buildAuthorizationResponse(
      mockClient,
      params,
      JohnDoe,
    );

    expect(response.code).toBe("test_code_123");
    expect(response.access_token).toBe("test-access-token");
    expect(response.token_type).toBe("Bearer");
    expect(response.expires_in).toBe("3600");
    expect(response.id_token).toBe("test-id-token");
    expect(response.session_state).toBeDefined();
  });
});
