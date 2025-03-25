// @vitest-environment happy-dom

import Image from "@/components/Image";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Image", () => {
  it("renders the image", () => {
    render(
      <Image
        src="https://example.com/image.jpg"
        alt="Example"
        width={100}
        height={100}
      />,
    );

    const image = document.querySelector("img");
    expect(image).toBeInTheDocument();
  });

  it("does not render the style attribute", () => {
    render(
      <Image
        src="https://example.com/image.jpg"
        alt="Example"
        width={100}
        height={100}
      />,
    );

    const image = document.querySelector("img");
    expect(image).not.toHaveAttribute("style");
  });
});
