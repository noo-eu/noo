// @vitest-environment happy-dom

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAnimationsApi } from "jsdom-testing-mocks";
import { wrapRender } from "tests/support";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasskeyItem } from "./PasskeyItem";
import { PasskeyNameEditor } from "./PasskeyNameEditor";
import { PasskeysPage } from "./PasskeysPage";

mockAnimationsApi();

// Sample passkeys data with proper dates
const samplePasskeys = vi.hoisted(() => [
  {
    id: "passkey1",
    name: "Device 1",
    createdAt: new Date("2023-01-01"),
    lastUsedAt: new Date("2023-01-10"),
  },
  {
    id: "passkey2",
    name: "Device 2",
    createdAt: new Date("2023-02-01"),
    lastUsedAt: new Date("2023-02-10"),
  },
]);

// Mock the startRegistration from SimpleWebAuthn
vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn().mockResolvedValue({ id: "new-passkey-id" }),
}));

// Mock toast notifications
vi.mock("react-toastify/unstyled", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the useActionState hook
vi.mock("react", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    useActionState: vi.fn().mockImplementation((action) => {
      return [
        false, // isPending
        action,
        false, // isPending
      ];
    }),
  };
});

describe("PasskeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the passkeys form with title and description", async () => {
    wrapRender(<PasskeysPage existingPasskeys={samplePasskeys} />);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description1")).toBeInTheDocument();
    expect(screen.getByText("register")).toBeInTheDocument();
  });

  it.skip("displays a list of existing passkeys", async () => {
    wrapRender(<PasskeysPage existingPasskeys={samplePasskeys} />);

    expect(screen.getByText("Device 1")).toBeInTheDocument();
    expect(screen.getByText("Device 2")).toBeInTheDocument();
    expect(screen.getByText("yourPasskeys")).toBeInTheDocument();
  });

  it("doesn't show passkeys section when no passkeys exist", async () => {
    wrapRender(<PasskeysPage existingPasskeys={[]} />);

    expect(screen.queryByText("yourPasskeys")).not.toBeInTheDocument();
  });
});

describe("PasskeyItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders passkey details correctly", async () => {
    wrapRender(<PasskeyItem passkey={samplePasskeys[0]} />);

    expect(screen.getByText("Device 1")).toBeInTheDocument();
    expect(screen.getByText("created")).toBeInTheDocument();
    expect(screen.getByText("lastUsed")).toBeInTheDocument();
  });

  it("opens confirmation dialog when remove button is clicked", async () => {
    const user = userEvent.setup();

    wrapRender(<PasskeyItem passkey={samplePasskeys[0]} />);

    const removeButton = screen.getByTitle("remove");
    await user.click(removeButton);

    expect(screen.getByText("confirmRemove")).toBeInTheDocument();
    expect(screen.getByText("confirm")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });
});

describe("PasskeyNameEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays the passkey name", () => {
    wrapRender(<PasskeyNameEditor passkey={samplePasskeys[0]} />);

    expect(screen.getByText("Device 1")).toBeInTheDocument();
  });

  it("shows edit form when edit button is clicked", async () => {
    const user = userEvent.setup();

    wrapRender(<PasskeyNameEditor passkey={samplePasskeys[0]} />);

    const editButton = screen.getByTitle("change");
    await user.click(editButton);

    const inputElement = screen.getByRole("textbox");
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue("Device 1");
  });

  it("shows 'Unnamed' for passkeys without a name", async () => {
    const passkeyWithoutName = { ...samplePasskeys[0], name: "" };

    wrapRender(<PasskeyNameEditor passkey={passkeyWithoutName} />);

    expect(screen.getByText("unnamed")).toBeInTheDocument();
  });
});
