// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { renderGender, renderBirthdate } from "./utils";
import { render } from "@testing-library/react";

const mockTranslations = (key: string) => {
  const dictionary: Record<string, string> = {
    "gender.male": "Male",
    "gender.female": "Female",
    "summary.unspecifiedGender": "Unspecified",
  };
  return dictionary[key] || key;
};

const mockFormatter = {
  dateTime: (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", options).format(date),
};

describe("renderGender", () => {
  it("returns custom gender text when gender is 'custom'", () => {
    const user = { gender: "custom", genderCustom: "Non-binary" };
    // @ts-expect-error strict type checking
    const result = renderGender(user, mockTranslations);
    expect(result).toBe("Non-binary");
  });

  it("returns translated male when gender is 'male'", () => {
    const user = { gender: "male" };
    // @ts-expect-error strict type checking
    const result = renderGender(user, mockTranslations);
    expect(result).toBe("Male");
  });

  it("returns translated female when gender is 'female'", () => {
    const user = { gender: "female" };
    // @ts-expect-error strict type checking
    const result = renderGender(user, mockTranslations);
    expect(result).toBe("Female");
  });

  it("returns italicized unspecified when gender is 'not_specified'", () => {
    const user = { gender: "not_specified" };
    // @ts-expect-error strict type checking
    const { container } = render(<>{renderGender(user, mockTranslations)}</>);
    expect(container.querySelector("i")?.textContent).toBe("Unspecified");
  });
});

describe("renderBirthdate", () => {
  it("formats birthdate correctly", () => {
    const birthdate = new Date("1990-04-15");
    // @ts-expect-error We just need one formatter
    const result = renderBirthdate(birthdate, mockFormatter);
    expect(result).toBe("April 15, 1990");
  });
});
