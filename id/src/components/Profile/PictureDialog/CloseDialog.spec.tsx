import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { CloseDialog } from "./CloseDialog";

afterEach(() => {
  cleanup();
});

describe("CloseDialog", () => {
  test("calls onClick when clicked", () => {
    const onClick = mock();
    render(<CloseDialog onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
