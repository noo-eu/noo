import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getNormalizedTimeZone, getSelect, displayTz } from "./timeZones";
import * as nextIntl from "next-intl";

describe("getNormalizedTimeZone", () => {
  it("returns the normalized timezone for known timezones", () => {
    expect(getNormalizedTimeZone("Europe/Paris")).toBe("CET");
    expect(getNormalizedTimeZone("Europe/London")).toBe("GMT");
    expect(getNormalizedTimeZone("Europe/Helsinki")).toBe("EET");
  });

  it("returns the original timezone for unknown timezones", () => {
    expect(getNormalizedTimeZone("America/New_York")).toBe("America/New_York");
    expect(getNormalizedTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });
});

describe("getSelect", () => {
  beforeEach(() => {
    // Mock Intl.supportedValuesOf
    global.Intl = {
      ...global.Intl,
      supportedValuesOf: vi.fn().mockImplementation((key) => {
        if (key === "timeZone") {
          return [
            "America/New_York",
            "Europe/Paris",
            "Asia/Tokyo",
            "Etc/UTC",
            "Africa/Cairo",
          ];
        }
        return [];
      }),
    };
  });

  it("filters out aggregated timezones and Etc/ timezones", () => {
    const result = getSelect();
    expect(result).toHaveProperty("America");
    expect(result).toHaveProperty("Asia");
    expect(result).toHaveProperty("Africa");

    // Europe/Paris is in AGGREGATED_TIMEZONES, so it should be filtered out
    expect(
      result.Europe?.some((tz) => tz.value === "Europe/Paris"),
    ).toBeFalsy();

    // Etc/UTC should be filtered out
    expect(
      Object.values(result)
        .flat()
        .some((tz) => tz.value === "Etc/UTC"),
    ).toBeFalsy();
  });

  it("correctly structures timezones by continent", () => {
    const result = getSelect();

    expect(result.America).toContainEqual({
      label: "New York",
      value: "America/New_York",
    });

    expect(result.Asia).toContainEqual({
      label: "Tokyo",
      value: "Asia/Tokyo",
    });
  });

  it("sorts timezones by label within each continent", () => {
    // Extend the mock to return multiple timezones for one continent
    global.Intl.supportedValuesOf = vi.fn().mockImplementation((key) => {
      if (key === "timeZone") {
        return ["America/New_York", "America/Chicago", "America/Los_Angeles"];
      }
      return [];
    });

    const result = getSelect();

    // Check sorting within America continent
    const americaLabels = result.America.map((tz) => tz.label);
    expect(americaLabels).toEqual(
      [...americaLabels].sort((a, b) => a.localeCompare(b)),
    );
  });
});

describe("displayTz", () => {
  let mockTranslate: Mock;

  beforeEach(() => {
    mockTranslate = vi.fn((key) => {
      const translations = {
        gmt: "Greenwich Mean Time",
        cet: "Central European Time",
        eet: "Eastern European Time",
      } as Record<string, string>;
      return translations[key] || key;
    });

    // @ts-expect-error Mocking next-intl
    vi.mocked(nextIntl.useTranslations).mockReturnValue(mockTranslate);
  });

  it("translates standard timezone abbreviations", () => {
    // @ts-expect-error Mocking next-intl
    expect(displayTz(mockTranslate, "GMT")).toBe("Greenwich Mean Time");
    // @ts-expect-error Mocking next-intl
    expect(displayTz(mockTranslate, "CET")).toBe("Central European Time");
    // @ts-expect-error Mocking next-intl
    expect(displayTz(mockTranslate, "EET")).toBe("Eastern European Time");

    expect(mockTranslate).toHaveBeenCalledWith("gmt");
    expect(mockTranslate).toHaveBeenCalledWith("cet");
    expect(mockTranslate).toHaveBeenCalledWith("eet");
  });

  it("formats other timezones correctly", () => {
    // @ts-expect-error Mocking next-intl
    expect(displayTz(mockTranslate, "America/New_York")).toBe(
      "America / New York",
    );

    // @ts-expect-error Mocking next-intl
    expect(displayTz(mockTranslate, "Asia/Tokyo")).toBe("Asia / Tokyo");
  });
});
