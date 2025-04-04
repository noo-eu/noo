// @vitest-environment happy-dom

import { AuthProvider } from "@/auth/authContext";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { JohnDoeClient } from "@/../tests/fixtures/users";
import { PasskeysPage } from "./PasskeysPage";
import { ClientUser } from "@/lib/types/ClientUser";
import * as actions from "@/app/security/passkeys/actions";
import { NextIntlClientProvider } from "next-intl";
import { ConfirmationProvider } from "@/components/Confirmation";
import { PasskeyItem } from "./PasskeyItem";
import { PasskeyNameEditor } from "./PasskeyNameEditor";
import userEvent from "@testing-library/user-event";
import { mockAnimationsApi } from "jsdom-testing-mocks";

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

// Mock the server actions
vi.mock("@/app/security/passkeys/actions", async () => ({
  getPasskeys: vi.fn().mockResolvedValue(samplePasskeys),
  registerPasskey: vi.fn().mockResolvedValue({ success: true }),
  removePasskey: vi.fn().mockResolvedValue({ success: true }),
  changePasskeyName: vi.fn().mockResolvedValue({
    success: true,
    input: { name: "New Device Name" },
  }),
  registrationOptions: vi.fn().mockResolvedValue({
    data: {},
    error: null,
  }),
  verifyRegistration: vi.fn().mockResolvedValue({
    success: true,
    error: null,
  }),
}));

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
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

function wrapRender(
  component: React.ReactNode,
  user: Partial<ClientUser> = {},
) {
  return render(
    <NextIntlClientProvider locale="en">
      <AuthProvider
        user={
          {
            ...JohnDoeClient,
            ...user,
          } as ClientUser
        }
      >
        <ConfirmationProvider>{component}</ConfirmationProvider>
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

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

  it("displays a list of existing passkeys", async () => {
    wrapRender(<PasskeysPage existingPasskeys={samplePasskeys} />);

    expect(screen.getByText("Device 1")).toBeInTheDocument();
    expect(screen.getByText("Device 2")).toBeInTheDocument();
    expect(screen.getByText("yourPasskeys")).toBeInTheDocument();
  });

  it("doesn't show passkeys section when no passkeys exist", async () => {
    wrapRender(<PasskeysPage existingPasskeys={[]} />);

    expect(screen.queryByText("yourPasskeys")).not.toBeInTheDocument();
  });

  it("attempts to register a new passkey when 'register' is clicked", async () => {
    const mockRegistrationOptions = actions.registrationOptions as Mock;
    const user = userEvent.setup();

    wrapRender(<PasskeysPage existingPasskeys={samplePasskeys} />);

    const addButton = screen.getByText("register");
    await user.click(addButton);

    expect(mockRegistrationOptions).toHaveBeenCalledWith(JohnDoeClient.id);
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

  it("calls removePasskey when remove is confirmed", async () => {
    const mockRemovePasskey = actions.removePasskey as Mock;
    const user = userEvent.setup();

    wrapRender(<PasskeyItem passkey={samplePasskeys[0]} />);

    const removeButton = screen.getByTitle("remove");
    await user.click(removeButton);

    const confirmButton = screen.getByText("confirm");
    await user.click(confirmButton);

    expect(mockRemovePasskey).toHaveBeenCalledWith(
      JohnDoeClient.id,
      "passkey1",
    );
  });

  it("does not call removePasskey when removal is cancelled", async () => {
    const mockRemovePasskey = actions.removePasskey as Mock;
    const user = userEvent.setup();

    wrapRender(<PasskeyItem passkey={samplePasskeys[0]} />);

    const removeButton = screen.getByTitle("remove");
    await user.click(removeButton);

    const cancelButton = screen.getByText("cancel");
    await user.click(cancelButton);

    expect(mockRemovePasskey).not.toHaveBeenCalled();
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

  it("calls changePasskeyName when form is submitted", async () => {
    const mockChangePasskeyName = actions.changePasskeyName as Mock;
    const user = userEvent.setup();

    wrapRender(<PasskeyNameEditor passkey={samplePasskeys[0]} />);

    const editButton = screen.getByTitle("change");
    await user.click(editButton);

    const inputElement = screen.getByRole("textbox");
    await user.clear(inputElement);
    await user.type(inputElement, "New Device Name");

    const saveButton = screen.getByTitle("save");
    await user.click(saveButton);

    expect(mockChangePasskeyName).toHaveBeenCalledWith(
      JohnDoeClient.id,
      "passkey1",
      expect.any(FormData),
    );
  });

  it("shows 'Unnamed' for passkeys without a name", async () => {
    const passkeyWithoutName = { ...samplePasskeys[0], name: "" };

    wrapRender(<PasskeyNameEditor passkey={passkeyWithoutName} />);

    expect(screen.getByText("unnamed")).toBeInTheDocument();
  });
});
