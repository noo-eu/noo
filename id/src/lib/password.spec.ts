import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkPwnedPassword } from "./password";
import { ok, err } from "neverthrow";

const TEST_PASSWORD = "testpassword";
const DIGEST = "8BB6118F8FD6935AD0876A3BE34A717D32708FFD".toLocaleUpperCase();

describe("checkPwnedPassword", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock AbortSignal.timeout
    vi.spyOn(AbortSignal, "timeout").mockImplementation(
      () => ({ aborted: false }) as AbortSignal,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 0 when password is not found in the database", async () => {
    // Mock fetch to return response with no matching hash
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "ABCDE:123\nFGHIJ:456",
    });

    const result = await checkPwnedPassword(TEST_PASSWORD);

    // Verify fetch was called with the first 5 characters of the hash
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pwnedpasswords.com/range/8BB61",
      {
        headers: { "Add-Padding": "true" },
        signal: expect.any(Object),
      },
    );

    // Verify result
    expect(result).toEqual(ok(0));
  });

  it("should return the count when password is found in the database", async () => {
    // Mock fetch to return response with matching hash
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => `ABCDE:123\n${DIGEST.slice(5)}:42\nFGHIJ:456`,
    });

    const result = await checkPwnedPassword("testpassword");

    // Verify result
    expect(result).toEqual(ok(42));
  });

  it("should handle API errors gracefully", async () => {
    // Mock fetch to return error response
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await checkPwnedPassword("testpassword");

    // Verify error result
    expect(result).toEqual(
      err("Failed to check password against Pwned Passwords database"),
    );
  });

  it("should handle network/timeout errors", async () => {
    // Mock fetch to throw error
    const networkError = new Error("Network error");
    fetchMock.mockRejectedValueOnce(networkError);

    const result = await checkPwnedPassword("testpassword");

    // Verify error result
    expect(result).toEqual(
      err(
        `Failed to check password against Pwned Passwords database: ${networkError}`,
      ),
    );
  });

  it("should ignore whitespace before and after the password before hashing", async () => {
    // Mock fetch to return response with no matching hash
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "ABCDE:123\nFGHIJ:456",
    });

    await checkPwnedPassword("  testpassword  ");

    // Verify fetch was called with the first 5 characters of the hash
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pwnedpasswords.com/range/8BB61",
      {
        headers: { "Add-Padding": "true" },
        signal: expect.any(Object),
      },
    );
  });
});
