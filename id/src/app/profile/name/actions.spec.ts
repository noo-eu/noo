// @vitest-environment happy-dom

import { updateName } from "./actions";
import { getSessionUserById } from "@/auth/SessionsService";
import Users from "@/db/users";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("@/auth/SessionsService", () => ({
  getSessionUserById: vi.fn(),
}));
vi.mock("@/db/users");
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(path);
  }),
}));

describe("updateName", () => {
  const form = (firstName: string, lastName: string) => {
    const data = new FormData();
    data.append("firstName", firstName);
    data.append("lastName", lastName);
    return data;
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects if session is missing", async () => {
    (getSessionUserById as Mock).mockResolvedValue(null);

    await expect(() =>
      updateName("usr_xxx", form("John", "Doe")),
    ).rejects.toThrow("/");
  });

  it("returns error if validation fails", async () => {
    (getSessionUserById as Mock).mockResolvedValue({ id: "abc" });

    const result = await updateName("usr_xxx", form("", ""));
    expect(result.error).toHaveProperty("firstName");
  });

  it("updates user if valid", async () => {
    (getSessionUserById as Mock).mockResolvedValue({ id: "abc" });

    const updateMock = vi.spyOn(Users, "update");
    const result = await updateName("usr_xxx", form("John", "Doe"));

    expect(updateMock).toHaveBeenCalledWith("abc", {
      firstName: "John",
      lastName: "Doe",
    });
    expect(result.error).toBeUndefined();
  });
});
