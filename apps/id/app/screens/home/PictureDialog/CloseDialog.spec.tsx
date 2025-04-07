// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, vi, test } from "vitest";
import { CloseDialog } from "./CloseDialog";

describe("CloseDialog", () => {
  test("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<CloseDialog onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
