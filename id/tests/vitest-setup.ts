import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

expect.extend(matchers);
afterEach(cleanup);

const mockT = vi.fn((key: string) => key);
// @ts-expect-error mock property
mockT.rich = vi.fn((key: string) => key);

// Mock translations
vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal()),
  useTranslations: vi.fn(() => mockT),
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString().split("T")[0],
    number: (n: number) => n.toString(),
    relativeTime: (d: Date) => d.toISOString().split("T")[0],
  }),
  useLocale: vi.fn(() => "en"),
  createTranslator: vi.fn(() => mockT),
}));

vi.resetModules();
